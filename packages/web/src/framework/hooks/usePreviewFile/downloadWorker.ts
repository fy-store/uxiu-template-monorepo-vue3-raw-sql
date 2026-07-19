import type {
	DownloadTaskOptions,
	DownloadTaskProgress,
	DownloadWorkerRequest,
	DownloadWorkerResponse
} from './downloadTaskTypes'
import { concurrencyControl } from '@common/concurrencyControl'
import { Encryptor } from '@common/encryptor'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { FileSystemManage } from '@/utils/fileSystemManage'

const workerSelf = self as unknown as {
	postMessage(message: DownloadWorkerResponse, transfer?: Transferable[]): void
	onmessage: ((event: MessageEvent<DownloadWorkerRequest>) => void) | null
	location: {
		origin: string
	}
	close(): void
}

class DownloadCanceledError extends Error {}

const fragmentDownloadConcurrency = 6

let paused = false
let canceled = false
let running = false
let loaded = 0
let currentFfmpeg: FFmpeg | null = null
const currentAbortControllers = new Set<AbortController>()
const responseAbortControllers = new WeakMap<Response, AbortController>()
const currentEncryptors = new Set<Encryptor>()
const resumeCallbacks = new Set<() => void>()

/**
 * 检查下载任务是否已取消。
 */
function throwIfCanceled() {
	if (canceled) {
		throw new DownloadCanceledError()
	}
}

/**
 * 等待暂停状态结束。
 */
async function waitIfPaused() {
	throwIfCanceled()
	if (!paused) return

	await new Promise<void>((resolve) => {
		resumeCallbacks.add(resolve)
	})
	throwIfCanceled()
}

/**
 * 唤醒全部暂停中的读取操作。
 */
function resolvePause() {
	resumeCallbacks.forEach((resolve) => resolve())
	resumeCallbacks.clear()
}

/**
 * 释放下载 Worker 内部持有的运行资源。
 */
function cleanupRuntime() {
	currentAbortControllers.forEach((controller) => controller.abort())
	currentAbortControllers.clear()
	currentEncryptors.forEach((encryptor) => encryptor.cancel())
	currentEncryptors.clear()

	try {
		currentFfmpeg?.terminate()
	} catch {}
	currentFfmpeg = null
	resolvePause()
}

/**
 * 向主线程发送下载进度。
 * @param progress 下载进度。
 */
function emitProgress(progress: DownloadTaskProgress) {
	workerSelf.postMessage({
		type: 'progress',
		progress
	})
}

type ResponseProgressReporter = (currentLoaded: number, total: number, done: boolean) => void

/**
 * 创建带暂停、取消和进度上报能力的响应流。
 * @param response 文件响应。
 * @param reportProgress 响应读取进度回调。
 */
function createResponseStream(response: Response, reportProgress: ResponseProgressReporter) {
	if (!response.body) {
		throw new Error('当前浏览器不支持流式下载')
	}

	const reader = response.body.getReader()
	const total = Number(response.headers.get('content-length') || 0)
	let currentLoaded = 0

	return new ReadableStream<Uint8Array>({
		async pull(controller) {
			await waitIfPaused()
			const result = await reader.read()
			if (result.done) {
				reportProgress(currentLoaded, total, true)
				controller.close()
				return
			}

			currentLoaded += result.value.byteLength
			loaded += result.value.byteLength
			reportProgress(currentLoaded, total, false)
			controller.enqueue(result.value)
		},
		async cancel(reason) {
			await reader.cancel(reason)
		}
	})
}

/**
 * 创建单文件下载进度上报器。
 * @param maxPercentage 下载阶段最大百分比。
 */
function createSingleFileProgressReporter(maxPercentage: number): ResponseProgressReporter {
	return (currentLoaded, total, done) => {
		const ratio = done ? 1 : total > 0 ? currentLoaded / total : 0
		emitProgress({
			percentage: Math.min(maxPercentage, Math.floor(ratio * maxPercentage)),
			loaded,
			total
		})
	}
}

/**
 * 创建多片段聚合下载进度上报器。
 * @param count 片段总数。
 * @param maxPercentage 下载阶段最大百分比。
 */
function createFragmentProgressReporters(count: number, maxPercentage: number) {
	const states = Array.from({ length: count }, () => ({
		loaded: 0,
		total: 0,
		done: false
	}))
	let lastPercentage = 0

	return states.map((state) => {
		const report: ResponseProgressReporter = (currentLoaded, total, done) => {
			state.loaded = currentLoaded
			state.total = total
			state.done = done

			const completedRatio = states.reduce((sum, item) => {
				if (item.done) return sum + 1
				if (item.total > 0) return sum + Math.min(1, item.loaded / item.total)
				return sum
			}, 0)
			const percentage = Math.min(maxPercentage, Math.floor((completedRatio / count) * maxPercentage))
			lastPercentage = Math.max(lastPercentage, percentage)

			emitProgress({
				percentage: lastPercentage,
				loaded,
				total: 0
			})
		}
		return report
	})
}

/**
 * 读取流中的全部数据块。
 * @param stream 可读流。
 */
async function* iterateStream(stream: ReadableStream<Uint8Array>) {
	const reader = stream.getReader()
	try {
		while (true) {
			await waitIfPaused()
			const { done, value } = await reader.read()
			if (done) return
			yield value
		}
	} finally {
		reader.releaseLock()
	}
}

/**
 * 获取单个文件响应。
 * @param url 文件 URL。
 */
async function fetchFile(url: string) {
	await waitIfPaused()
	const controller = new AbortController()
	currentAbortControllers.add(controller)

	try {
		const response = await fetch(url, {
			credentials: 'include',
			signal: controller.signal
		})
		if (!response.ok) {
			throw new Error(`文件下载失败: ${response.status}`)
		}
		responseAbortControllers.set(response, controller)
		return response
	} catch (error) {
		currentAbortControllers.delete(controller)
		throw error
	}
}

/**
 * 释放单个响应对应的取消控制器。
 * @param response 文件响应。
 */
function releaseResponse(response: Response) {
	const controller = responseAbortControllers.get(response)
	if (!controller) return

	currentAbortControllers.delete(controller)
	responseAbortControllers.delete(response)
}

/**
 * 读取并可选解密单个响应。
 * @param response 文件响应。
 * @param options 下载配置。
 * @param reportProgress 响应读取进度回调。
 */
async function* iterateResponse(
	response: Response,
	options: DownloadTaskOptions,
	reportProgress: ResponseProgressReporter
) {
	let encryptor: Encryptor | null = null

	try {
		let stream = createResponseStream(response, reportProgress)
		if (options.password) {
			encryptor = new Encryptor({ key: options.password })
			currentEncryptors.add(encryptor)
			stream = encryptor.decryptStream(stream)
		}

		yield* iterateStream(stream)
	} finally {
		if (encryptor) {
			currentEncryptors.delete(encryptor)
		}
		releaseResponse(response)
	}
}

/**
 * 读取并可选解密单个响应为二进制数据。
 * @param response 文件响应。
 * @param options 下载配置。
 * @param reportProgress 响应读取进度回调。
 * @returns 解密后的文件数据。
 */
async function readResponseBuffer(
	response: Response,
	options: DownloadTaskOptions,
	reportProgress: ResponseProgressReporter
) {
	const chunks: Uint8Array[] = []
	for await (const chunk of iterateResponse(response, options, reportProgress)) {
		chunks.push(chunk)
	}
	return new Uint8Array(mergeChunks(chunks))
}

/**
 * 获取片段目录索引。
 * @param folderUrl 片段目录 URL。
 * @returns 片段文件名列表。
 */
async function getFragmentIndexList(folderUrl: string) {
	const baseUrl = folderUrl.replace(/\/+$/, '')
	const indexResponse = await fetchFile(`${baseUrl}/index.json`)
	let indexData: { indexList?: unknown[] }
	try {
		indexData = await indexResponse.json()
	} finally {
		releaseResponse(indexResponse)
	}
	const indexList = indexData.indexList?.filter(
		(filename): filename is string => typeof filename === 'string' && filename.length > 0
	)
	if (!indexList?.length) {
		throw new Error('片段清单为空')
	}
	return indexList
}

interface FragmentFile {
	filename: string
	data: Uint8Array
}

/**
 * 下载并读取单个片段。
 * @param baseUrl 片段目录 URL。
 * @param filename 片段文件名。
 * @param options 下载配置。
 * @param reportProgress 响应读取进度回调。
 */
async function downloadFragmentFile(
	baseUrl: string,
	filename: string,
	options: DownloadTaskOptions,
	reportProgress: ResponseProgressReporter
) {
	const response = await fetchFile(`${baseUrl}/${encodeURIComponent(filename)}`)
	const data = await readResponseBuffer(response, options, reportProgress)
	return {
		filename,
		data
	}
}

/**
 * 并发下载指定范围的片段，并将结果保存在范围内的原始顺序。
 * @param baseUrl 片段目录 URL。
 * @param indexList 片段文件名列表。
 * @param options 下载配置。
 * @param reporters 片段下载进度上报器。
 * @param start 起始索引。
 * @param end 结束索引。
 */
async function downloadFragmentRange(
	baseUrl: string,
	indexList: string[],
	options: DownloadTaskOptions,
	reporters: ResponseProgressReporter[],
	start: number,
	end: number
) {
	const files = new Array<FragmentFile>(end - start)
	const limit = Math.min(fragmentDownloadConcurrency, end - start)

	await concurrencyControl(async (ctx) => {
		const index = start + ctx.index - 1
		if (index >= end) {
			ctx.stop()
			return
		}

		await waitIfPaused()
		const filename = indexList[index]
		const reportProgress = reporters[index]
		if (!filename || !reportProgress) {
			throw new Error('片段下载任务无效')
		}

		files[index - start] = await downloadFragmentFile(baseUrl, filename, options, reportProgress)
	}, limit)

	return files
}

/**
 * 并发下载片段，并将结果保存在片段清单对应的索引位置。
 * @param baseUrl 片段目录 URL。
 * @param indexList 片段文件名列表。
 * @param options 下载配置。
 * @param maxPercentage 下载阶段最大百分比。
 */
async function downloadFragmentFiles(
	baseUrl: string,
	indexList: string[],
	options: DownloadTaskOptions,
	maxPercentage: number
) {
	const reporters = createFragmentProgressReporters(indexList.length, maxPercentage)
	return downloadFragmentRange(baseUrl, indexList, options, reporters, 0, indexList.length)
}

/**
 * 分批并发下载片段，并按清单顺序输出。
 * @param baseUrl 片段目录 URL。
 * @param indexList 片段文件名列表。
 * @param options 下载配置。
 * @param maxPercentage 下载阶段最大百分比。
 */
async function* iterateFragmentFiles(
	baseUrl: string,
	indexList: string[],
	options: DownloadTaskOptions,
	maxPercentage: number
) {
	const reporters = createFragmentProgressReporters(indexList.length, maxPercentage)

	for (let start = 0; start < indexList.length; start += fragmentDownloadConcurrency) {
		await waitIfPaused()
		const end = Math.min(start + fragmentDownloadConcurrency, indexList.length)
		const files = await downloadFragmentRange(baseUrl, indexList, options, reporters, start, end)
		for (const file of files) {
			yield file
		}
	}
}

/**
 * 按下载源生成输出数据块。
 * @param options 下载配置。
 */
async function* iterateDownload(options: DownloadTaskOptions) {
	if (options.source.type === 'url') {
		const response = await fetchFile(options.source.url)
		yield* iterateResponse(
			response,
			options,
			createSingleFileProgressReporter(options.password ? 95 : 100)
		)
		return
	}

	const baseUrl = options.source.folderUrl.replace(/\/+$/, '')
	const indexList = await getFragmentIndexList(baseUrl)
	for await (const file of iterateFragmentFiles(baseUrl, indexList, options, options.password ? 95 : 100)) {
		yield file.data
	}
}

/**
 * 获取当前站点中的 ffmpeg 核心文件地址。
 * @param filename 核心文件名。
 * @returns 核心文件绝对地址。
 */
function getFfmpegCoreUrl(filename: string) {
	const baseUrl = import.meta.env.BASE_URL.endsWith('/')
		? import.meta.env.BASE_URL
		: `${import.meta.env.BASE_URL}/`
	return new URL(`${baseUrl}ffmpeg-core/${filename}`, workerSelf.location.origin).toString()
}

interface DashTrack {
	id: string
	init?: Uint8Array
	segments: Array<{
		index: number
		data: Uint8Array
	}>
}

/**
 * 将 DASH 初始化片段和媒体片段按轨道合并为独立 fMP4。
 * @param files 已解密的 DASH 文件。
 * @param manifestIndex MPD 文件索引名。
 * @returns 可作为 ffmpeg 输入的轨道文件。
 */
function createDashTrackFiles(files: Map<string, Uint8Array>, manifestIndex: string) {
	const tracks = new Map<string, DashTrack>()

	/**
	 * 获取指定轨道的数据容器。
	 * @param id DASH Representation ID。
	 * @returns 轨道数据容器。
	 */
	function getTrack(id: string) {
		let track = tracks.get(id)
		if (!track) {
			track = {
				id,
				segments: []
			}
			tracks.set(id, track)
		}
		return track
	}

	for (const [filename, data] of files) {
		if (filename === manifestIndex) continue

		const initMatch = filename.match(/^init-(.+)$/)
		if (initMatch?.[1]) {
			getTrack(initMatch[1]).init = data
			continue
		}

		const segmentMatch = filename.match(/^chunk-(.+)-(\d+)$/)
		if (segmentMatch?.[1] && segmentMatch[2]) {
			getTrack(segmentMatch[1]).segments.push({
				index: Number(segmentMatch[2]),
				data
			})
		}
	}

	const result: Array<{
		name: string
		data: Uint8Array
	}> = []
	for (const track of tracks.values()) {
		if (!track.init || !track.segments.length) continue

		track.segments.sort((a, b) => a.index - b.index)
		const chunks = [track.init, ...track.segments.map((item) => item.data)]
		result.push({
			name: `track-${result.length}.mp4`,
			data: new Uint8Array(mergeChunks(chunks))
		})
	}

	if (!result.length) {
		throw new Error('未识别到可封装的 DASH 媒体轨道')
	}
	return result
}

/**
 * 解密 DASH 文件集合并封装为标准 MP4。
 * @param options 下载任务配置。
 * @returns 可播放的 MP4 数据。
 */
async function remuxDashToMp4(options: DownloadTaskOptions) {
	if (options.source.type !== 'fragments' || !options.manifestIndex) {
		throw new Error('DASH 下载配置不完整')
	}

	const baseUrl = options.source.folderUrl.replace(/\/+$/, '')
	const indexList = await getFragmentIndexList(baseUrl)
	if (!indexList.includes(options.manifestIndex)) {
		throw new Error('DASH manifest 片段不存在')
	}

	const files = new Map<string, Uint8Array>()
	const fragmentFiles = await downloadFragmentFiles(baseUrl, indexList, options, 75)
	for (const file of fragmentFiles) {
		files.set(file.filename, file.data)
	}

	throwIfCanceled()
	const ffmpeg = new FFmpeg()
	currentFfmpeg = ffmpeg
	const logs: string[] = []
	ffmpeg.on('log', ({ message }) => {
		logs.push(message)
		if (logs.length > 30) {
			logs.shift()
		}
	})
	ffmpeg.on('progress', ({ progress }) => {
		emitProgress({
			percentage: Math.min(99, 75 + Math.floor(progress * 24)),
			loaded,
			total: 0
		})
	})

	await ffmpeg.load({
		coreURL: getFfmpegCoreUrl('ffmpeg-core.js'),
		wasmURL: getFfmpegCoreUrl('ffmpeg-core.wasm')
	})
	throwIfCanceled()

	const trackFiles = createDashTrackFiles(files, options.manifestIndex)
	for (const track of trackFiles) {
		await ffmpeg.writeFile(track.name, track.data)
	}

	const outputName = 'download.mp4'
	const inputArgs = trackFiles.flatMap((track) => ['-i', track.name])
	const mapArgs = trackFiles.flatMap((_, index) => ['-map', `${index}:0`])
	const exitCode = await ffmpeg.exec([
		...inputArgs,
		...mapArgs,
		'-c',
		'copy',
		'-avoid_negative_ts',
		'make_zero',
		'-movflags',
		'+faststart',
		outputName
	])
	if (exitCode !== 0) {
		const detail = logs.slice(-8).join('\n')
		throw new Error(`视频封装失败: ${exitCode}${detail ? `\n${detail}` : ''}`)
	}

	const output = await ffmpeg.readFile(outputName)
	if (typeof output === 'string') {
		throw new Error('视频封装结果格式错误')
	}

	const result = new Uint8Array(output.byteLength)
	result.set(output)
	ffmpeg.terminate()
	currentFfmpeg = null
	return result.buffer
}

/**
 * 将异步迭代器转换为可读流。
 * @param iterator 数据块迭代器。
 */
function iteratorToReadableStream(iterator: AsyncGenerator<Uint8Array>) {
	return new ReadableStream<Uint8Array>({
		async pull(controller) {
			const { done, value } = await iterator.next()
			if (done) {
				controller.close()
				return
			}
			controller.enqueue(value)
		},
		async cancel() {
			await iterator.return(void 0)
		}
	})
}

/**
 * 合并数据块。
 * @param chunks 数据块列表。
 */
function mergeChunks(chunks: Uint8Array[]) {
	const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
	const merged = new Uint8Array(total)
	let offset = 0
	for (const chunk of chunks) {
		merged.set(chunk, offset)
		offset += chunk.byteLength
	}
	return merged.buffer
}

/**
 * 执行下载任务。
 * @param options 下载配置。
 */
async function runDownload(options: DownloadTaskOptions) {
	if (running) {
		throw new Error('下载任务已在运行')
	}

	running = true
	paused = false
	canceled = false
	loaded = 0

	try {
		if (options.source.type === 'fragments' && options.manifestIndex) {
			const buffer = await remuxDashToMp4(options)
			if (options.directoryHandle) {
				const fileSystemManage = new FileSystemManage(options.directoryHandle)
				await fileSystemManage.writeFileFromStream(options.filename, new Blob([buffer]).stream())
				emitProgress({ percentage: 100, loaded, total: 0 })
				workerSelf.postMessage({
					type: 'complete',
					result: {
						mimeType: options.mimeType || 'video/mp4'
					}
				})
				return
			}

			emitProgress({ percentage: 100, loaded, total: loaded })
			workerSelf.postMessage(
				{
					type: 'complete',
					result: {
						buffer,
						mimeType: options.mimeType || 'video/mp4'
					}
				},
				[buffer]
			)
			return
		}

		const iterator = iterateDownload(options)
		if (options.directoryHandle) {
			const fileSystemManage = new FileSystemManage(options.directoryHandle)
			await fileSystemManage.writeFileFromStream(options.filename, iteratorToReadableStream(iterator))
			emitProgress({ percentage: 100, loaded, total: 0 })
			workerSelf.postMessage({
				type: 'complete',
				result: {
					mimeType: options.mimeType || 'application/octet-stream'
				}
			})
			return
		}

		const chunks: Uint8Array[] = []
		for await (const chunk of iterator) {
			chunks.push(chunk)
		}
		const buffer = mergeChunks(chunks)
		emitProgress({ percentage: 100, loaded, total: loaded })
		workerSelf.postMessage(
			{
				type: 'complete',
				result: {
					buffer,
					mimeType: options.mimeType || 'application/octet-stream'
				}
			},
			[buffer]
		)
	} catch (error) {
		if (
			canceled ||
			error instanceof DownloadCanceledError ||
			(error instanceof DOMException && error.name === 'AbortError')
		) {
			workerSelf.postMessage({ type: 'canceled' })
			return
		}
		workerSelf.postMessage({
			type: 'error',
			error: error instanceof Error ? error.message : String(error)
		})
	} finally {
		cleanupRuntime()
		running = false
		workerSelf.onmessage = null
		workerSelf.close()
	}
}

/**
 * 接收主线程的下载控制消息。
 * @param event Worker 消息事件。
 */
workerSelf.onmessage = (event) => {
	const message = event.data
	if (message.type === 'start') {
		void runDownload(message.options)
		return
	}
	if (message.type === 'pause') {
		paused = true
		return
	}
	if (message.type === 'resume') {
		paused = false
		resolvePause()
		return
	}
	if (message.type === 'cancel') {
		canceled = true
		paused = false
		cleanupRuntime()
	}
}
