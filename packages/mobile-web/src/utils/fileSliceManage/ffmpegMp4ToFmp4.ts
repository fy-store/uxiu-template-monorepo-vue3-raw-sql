import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import type { FileSliceManageDashFmp4File, FileSliceManageMp4ToDashFmp4Options, FileSliceManageMp4ToDashFmp4Result } from './types'

const ffmpeg = new FFmpeg()
let loadTask: Promise<boolean> | null = null
let localCoreConfigTask: Promise<Parameters<FFmpeg['load']>[0]> | null = null

/** DASH 清单文件名 */
const MANIFEST_FILE_NAME = 'manifest.mpd'
/** 流拷贝尝试阶段占用的转码进度比例, 剩余进度留给可能的重编码 */
const COPY_PASS_PROGRESS_RATIO = 0.1
/**
 * 分片时长超过目标时长的该倍数即认为关键帧过疏, 需要重编码。
 * 浏览器内重编码是单线程 wasm, 代价极高, 阈值取较宽以避免把仅轻微超标的视频送去重编码。
 */
const SEGMENT_DURATION_TOLERANCE = 3
/** hvcC 中用于还原 codec 字符串的头部长度 */
const HEVC_CONFIG_HEADER_LENGTH = 13

function getLocalCoreUrl(filename: string) {
	const baseUrl = `${import.meta.env.BASE_URL}ffmpeg-core`
	return `${baseUrl}/${filename}`
}

async function getDefaultLoadConfig(): Promise<Parameters<FFmpeg['load']>[0]> {
	if (!localCoreConfigTask) {
		localCoreConfigTask = Promise.all([
			toBlobURL(getLocalCoreUrl('ffmpeg-core.js'), 'text/javascript'),
			toBlobURL(getLocalCoreUrl('ffmpeg-core.wasm'), 'application/wasm')
		]).then(([coreURL, wasmURL]) => ({
			coreURL,
			wasmURL
		}))
	}

	return localCoreConfigTask
}

async function loadFfmpeg(config?: Parameters<FFmpeg['load']>[0]) {
	if (ffmpeg.loaded) {
		return false
	}

	if (!loadTask) {
		loadTask = (async () => {
			const loadConfig = config ?? (await getDefaultLoadConfig())
			return ffmpeg.load(loadConfig)
		})().finally(() => {
			loadTask = null
		})
	}

	return loadTask
}

async function readOutputFiles(dirPath: string) {
	const nodes = await ffmpeg.listDir(dirPath)
	const fileNodes = nodes.filter((node) => !node.isDir && node.name !== '.' && node.name !== '..')
	const files: Array<{ name: string; data: Uint8Array }> = []

	for (const node of fileNodes) {
		const data = await ffmpeg.readFile(`${dirPath}/${node.name}`)
		if (typeof data === 'string') {
			files.push({ name: node.name, data: new TextEncoder().encode(data) })
		} else {
			files.push({ name: node.name, data })
		}
	}

	return files
}

/**
 * 读取 ffmpeg 文件系统中的文件。
 * @param path 文件路径。
 * @returns 文件内容, 读取失败时返回 null。
 */
async function readFfmpegFile(path: string) {
	try {
		const data = await ffmpeg.readFile(path)
		return typeof data === 'string' ? new TextEncoder().encode(data) : data
	} catch {
		return null
	}
}

async function cleanupFfmpegDir(dirPath: string) {
	try {
		const nodes = await ffmpeg.listDir(dirPath)

		for (const node of nodes) {
			if (node.name === '.' || node.name === '..') {
				continue
			}

			if (node.isDir) {
				await cleanupFfmpegDir(`${dirPath}/${node.name}`)
				await ffmpeg.deleteDir(`${dirPath}/${node.name}`)
			} else {
				await ffmpeg.deleteFile(`${dirPath}/${node.name}`)
			}
		}

		await ffmpeg.deleteDir(dirPath)
	} catch {}
}

function toArrayBuffer(data: Uint8Array) {
	const buffer = new ArrayBuffer(data.byteLength)
	new Uint8Array(buffer).set(data)
	return buffer
}

function getDashFileType(name: string): FileSliceManageDashFmp4File['type'] {
	if (name.startsWith('init-')) return 'init'
	return 'segment'
}

function sortDashFiles(a: FileSliceManageDashFmp4File, b: FileSliceManageDashFmp4File) {
	if (a.type !== b.type) {
		return a.type === 'init' ? -1 : 1
	}

	return a.name.localeCompare(b.name)
}

/**
 * 构造 DASH 输出参数。
 * @param outputPath 输出目录。
 * @param segmentDuration 目标分片时长(秒)。
 * @returns ffmpeg 参数列表。
 */
function createDashArgs(outputPath: string, segmentDuration: number) {
	return [
		'-f',
		'dash',
		'-streaming',
		'1',
		'-seg_duration',
		String(segmentDuration),
		'-use_template',
		'1',
		'-use_timeline',
		'1',
		'-init_seg_name',
		'init-$RepresentationID$',
		'-media_seg_name',
		'chunk-$RepresentationID$-$Number%05d$',
		`${outputPath}/${MANIFEST_FILE_NAME}`
	]
}

/**
 * 执行 ffmpeg 命令, 退出码非 0 时抛错。
 * @param args ffmpeg 参数列表。
 */
async function runFfmpeg(args: string[]) {
	const code = await ffmpeg.exec(args)

	if (code !== 0) {
		throw new Error(`ffmpeg mp4 to fmp4 failed, code: ${code}`)
	}
}

/**
 * 读取 DASH 清单文本。
 * @param outputPath 输出目录。
 * @returns MPD 文本。
 */
async function readManifestText(outputPath: string) {
	const data = await ffmpeg.readFile(`${outputPath}/${MANIFEST_FILE_NAME}`)
	return typeof data === 'string' ? data : new TextDecoder().decode(data)
}

/**
 * 按 RFC 6381 由 hvcC 配置还原完整 HEVC codec 字符串。
 * @param config hvcC 载荷。
 * @param fourcc 采样条目格式, hvc1 或 hev1。
 * @returns codec 字符串, 载荷过短时返回空串。
 */
function getHevcCodecString(config: Uint8Array, fourcc: string) {
	if (config.byteLength < HEVC_CONFIG_HEADER_LENGTH) return ''

	const profileSpace = config[1] >> 6
	const tierFlag = (config[1] >> 5) & 0x1
	const profileIdc = config[1] & 0x1f
	const levelIdc = config[12]
	// 兼容标志是 32 位大端整数, 输出时需要按位反转
	let compatibilityFlags = 0
	for (let byteIndex = 2; byteIndex < 6; byteIndex++) {
		compatibilityFlags = compatibilityFlags * 256 + config[byteIndex]
	}
	let reversedFlags = 0
	for (let bitIndex = 0; bitIndex < 32; bitIndex++) {
		reversedFlags = reversedFlags * 2 + ((compatibilityFlags >>> bitIndex) & 1)
	}

	const parts = [`${profileSpace === 0 ? '' : String.fromCharCode(64 + profileSpace)}${profileIdc}`, reversedFlags.toString(16), `${tierFlag ? 'H' : 'L'}${levelIdc}`]
	// 约束标志按字节追加, 全零的字节省略
	for (let index = 6; index < 12; index++) {
		if (config[index] !== 0) {
			parts.push(config[index].toString(16).padStart(2, '0'))
		}
	}

	return `${fourcc}.${parts.join('.')}`
}

/**
 * 取 init 片段中 hvcC 载荷。
 * @param data init 片段内容。
 * @returns hvcC 载荷, 未找到时返回 null。
 */
function getHvcCPayload(data: Uint8Array) {
	const marker = [0x68, 0x76, 0x63, 0x43]
	for (let index = 4; index + 4 + HEVC_CONFIG_HEADER_LENGTH <= data.byteLength; index++) {
		if (!marker.every((byte, offset) => data[index + offset] === byte)) continue

		return data.subarray(index + 4, index + 4 + HEVC_CONFIG_HEADER_LENGTH)
	}

	return null
}

/**
 * 补全 MPD 中不完整的 HEVC codec 字符串。
 * ffmpeg 写清单时对 HEVC 只写裸的 hvc1/hev1, 浏览器与 shaka 会因字符串不完整判定该轨道不支持并报 4032
 * (CONTENT_UNSUPPORTED_BY_BROWSER), 但实际浏览器是能解码的, 需从 init 片段的 hvcC 还原完整字符串。
 * @param manifestText MPD 文本。
 * @param outputPath 输出目录。
 * @returns 补全后的 MPD 文本。
 */
async function fixHevcCodecString(manifestText: string, outputPath: string) {
	const targets = [...manifestText.matchAll(/<Representation\b[^>]*>/g)]
		.map((match) => ({
			tag: match[0],
			id: /id="([^"]+)"/.exec(match[0])?.[1],
			fourcc: /codecs="(hvc1|hev1)"/.exec(match[0])?.[1]
		}))
		.filter((target): target is { tag: string; id: string; fourcc: string } => Boolean(target.id && target.fourcc))

	let result = manifestText
	for (const target of targets) {
		const initData = await readFfmpegFile(`${outputPath}/init-${target.id}`)
		if (!initData) continue

		const config = getHvcCPayload(initData)
		const codec = config ? getHevcCodecString(config, target.fourcc) : ''
		if (!codec) continue

		result = result.replace(target.tag, target.tag.replace(`codecs="${target.fourcc}"`, `codecs="${codec}"`))
	}

	return result
}

/**
 * 补全 MPD 中的 HEVC codec 字符串, 有改动时写回 ffmpeg 文件系统。
 * @param outputPath 输出目录。
 * @returns 补全后的 MPD 文本。
 */
async function fixHevcCodecStringInManifest(outputPath: string) {
	const manifestText = await readManifestText(outputPath)
	const fixedText = await fixHevcCodecString(manifestText, outputPath)
	if (fixedText !== manifestText) {
		await ffmpeg.writeFile(`${outputPath}/${MANIFEST_FILE_NAME}`, new TextEncoder().encode(fixedText))
	}

	return fixedText
}

/**
 * 解析 MPD 中最长的分片时长。
 * 流拷贝只能在关键帧切分, 源视频关键帧过疏时实际分片会远长于 seg_duration, 需要据此判断是否重编码。
 * @param manifestText MPD 文本。
 * @returns 最长分片时长(秒), 无法解析时返回 0。
 */
function getMaxSegmentDurationSeconds(manifestText: string) {
	let maxDuration = 0

	// 每条 Representation 的 SegmentTemplate 各自带 timescale, 需要按块配对
	for (const block of manifestText.split('<SegmentTemplate').slice(1)) {
		const timescale = Number(/timescale="(\d+)"/.exec(block)?.[1] ?? 0)
		if (!timescale) continue

		for (const match of block.matchAll(/<S\b[^>]*?\bd="(\d+)"/g)) {
			maxDuration = Math.max(maxDuration, Number(match[1]) / timescale)
		}
	}

	return maxDuration
}

/**
 * 解析 MPD 中浏览器 MSE 无法播放的轨道。
 * 流拷贝会原样保留源编码, 源视频为 HEVC、音频为 AC-3 等编码时浏览器无法通过 MSE 播放,
 * 表现为播放器报 4032 (CONTENT_UNSUPPORTED_BY_BROWSER)。
 * @param manifestText MPD 文本。
 * @returns 不支持的轨道列表, 无法判断时返回空数组。
 */
function getUnsupportedTracks(manifestText: string) {
	// MediaSource 只在主线程可用, 不可用时无法判断, 交由播放器自行处理
	if (typeof MediaSource === 'undefined') return []

	const tracks: Array<{ mimeType: string; codecs: string }> = []
	for (const match of manifestText.matchAll(/<Representation\b[^>]*>/g)) {
		const mimeType = /mimeType="([^"]+)"/.exec(match[0])?.[1]
		const codecs = /codecs="([^"]+)"/.exec(match[0])?.[1]
		if (!mimeType || !codecs) continue

		tracks.push({ mimeType, codecs })
	}

	return tracks.filter((track) => !MediaSource.isTypeSupported(`${track.mimeType}; codecs="${track.codecs}"`))
}

/**
 * 使用 ffmpeg.wasm 在浏览器本地将 MP4 转为标准 DASH fMP4。
 *
 * 先尝试流拷贝; 流拷贝只能在关键帧处切分, 源视频关键帧过疏时分片会远长于 seg_duration,
 * 导致播放 seek 需要整片下载解密; 且流拷贝会保留源编码, 浏览器 MSE 不支持时无法播放。
 * 上述任一情况出现时改为重编码转码, 视频统一转 H.264 并按分片时长强制插入关键帧, 音频不支持时转 AAC。
 * 另外 ffmpeg 对 HEVC 只写裸的 hvc1/hev1, 会因 codec 字符串不完整被判定为不支持, 需从 init 片段的 hvcC 补全。
 */
export async function mp4ToDashFmp4(file: File, options: FileSliceManageMp4ToDashFmp4Options = {}): Promise<FileSliceManageMp4ToDashFmp4Result> {
	const {
		segmentDuration = 5,
		loadConfig,
		onProgress,
		onLog
	} = options
	const inputName = `input-${Date.now()}.mp4`
	const outputPath = `/dash-${Date.now()}`
	const manifestName = 'manifest'
	// 流拷贝阶段占 [0, COPY_PASS_PROGRESS_RATIO], 重编码阶段占剩余进度
	let progressBase = 0
	let progressScale = COPY_PASS_PROGRESS_RATIO
	const progressHandler = onProgress
		? ({ progress, time }: { progress: number; time: number }) => {
				onProgress({
					ratio: progressBase + progress * progressScale,
					time
				})
			}
		: null
	const logHandler = onLog
		? ({ message }: { type: string; message: string }) => {
				onLog(message)
			}
		: null

	if (progressHandler) {
		ffmpeg.on('progress', progressHandler)
	}

	if (logHandler) {
		ffmpeg.on('log', logHandler)
	}

	try {
		await loadFfmpeg(loadConfig)
		await ffmpeg.createDir(outputPath)
		await ffmpeg.writeFile(inputName, await fetchFile(file))

		const mapArgs = ['-i', inputName, '-map', '0:v:0?', '-map', '0:a?']
		await runFfmpeg([...mapArgs, '-c', 'copy', ...createDashArgs(outputPath, segmentDuration)])

		const copyPassManifest = await fixHevcCodecStringInManifest(outputPath)
		const unsupportedTracks = getUnsupportedTracks(copyPassManifest)
		const segmentTooLong = getMaxSegmentDurationSeconds(copyPassManifest) > segmentDuration * SEGMENT_DURATION_TOLERANCE
		const shouldReencodeVideo = segmentTooLong || unsupportedTracks.some((track) => track.mimeType.startsWith('video/'))
		const shouldReencodeAudio = unsupportedTracks.some((track) => track.mimeType.startsWith('audio/'))

		if (shouldReencodeVideo || shouldReencodeAudio) {
			const reasons = [
				segmentTooLong ? `分片时长超过 ${segmentDuration} 秒目标值` : '',
				unsupportedTracks.length ? `浏览器不支持的编码 ${unsupportedTracks.map((track) => track.codecs).join(' / ')}` : ''
			].filter(Boolean)
			onLog?.(`流拷贝结果无法正常播放(${reasons.join(', ')}), 改为重编码转码`)
			await cleanupFfmpegDir(outputPath)
			await ffmpeg.createDir(outputPath)
			progressBase = COPY_PASS_PROGRESS_RATIO
			progressScale = 1 - COPY_PASS_PROGRESS_RATIO
			await runFfmpeg([
				...mapArgs,
				// 浏览器不支持的音频转 AAC, 否则无需重编码
				'-c:a',
				shouldReencodeAudio ? 'aac' : 'copy',
				// 仅视频编码不支持或分片过长时重编码视频, 并强制按分片时长插入关键帧
				...(shouldReencodeVideo
					? ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-force_key_frames', `expr:gte(t,n_forced*${segmentDuration})`]
					: ['-c:v', 'copy']),
				...createDashArgs(outputPath, segmentDuration)
			])
		}

		// 第二阶段只重编码音频时视频仍为流拷贝, MPD 中 HEVC 的 codecs 需要再补全一次
		await fixHevcCodecStringInManifest(outputPath)

		const outputFiles = await readOutputFiles(outputPath)
		const manifestFile = outputFiles.find((item) => item.name === MANIFEST_FILE_NAME)
		if (!manifestFile) {
			throw new Error('ffmpeg 未生成 manifest.mpd')
		}

		const manifestText = new TextDecoder().decode(manifestFile.data)
		const mediaFiles = outputFiles
			.filter((item) => item.name !== MANIFEST_FILE_NAME)
			.map<FileSliceManageDashFmp4File>((item) => {
				const buffer = toArrayBuffer(item.data)
				return {
					name: item.name,
					buffer,
					blob: new Blob([buffer]),
					type: getDashFileType(item.name)
				}
			})
			.sort(sortDashFiles)
		// 直接使用原始字节, 避免 TextEncoder 缓冲区可能大于实际数据导致密文尾部出现多余字节
		const manifestBuffer = toArrayBuffer(manifestFile.data)

		return {
			manifestName,
			manifestText,
			files: [
				{
					name: manifestName,
					buffer: manifestBuffer,
					blob: new Blob([manifestBuffer], { type: 'application/dash+xml' }),
					type: 'manifest'
				},
				...mediaFiles
			],
			mediaFiles
		}
	} finally {
		if (progressHandler) {
			ffmpeg.off('progress', progressHandler)
		}

		if (logHandler) {
			ffmpeg.off('log', logHandler)
		}

		try {
			await ffmpeg.deleteFile(inputName)
		} catch {}

		await cleanupFfmpegDir(outputPath)
	}
}
