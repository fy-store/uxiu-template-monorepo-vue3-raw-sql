import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import type { FileSliceManageDashFmp4File, FileSliceManageMp4ToDashFmp4Options, FileSliceManageMp4ToDashFmp4Result } from './types'

const ffmpeg = new FFmpeg()
let loadTask: Promise<boolean> | null = null
let localCoreConfigTask: Promise<Parameters<FFmpeg['load']>[0]> | null = null

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
 * 使用 ffmpeg.wasm 在浏览器本地将 MP4 转为标准 DASH fMP4。
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
	const progressHandler = onProgress
		? ({ progress, time }: { progress: number; time: number }) => {
				onProgress({
					ratio: progress,
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

		const code = await ffmpeg.exec([
			'-i',
			inputName,
			'-map',
			'0:v:0?',
			'-map',
			'0:a?',
			'-c',
			'copy',
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
			`${outputPath}/manifest.mpd`
		])

		if (code !== 0) {
			throw new Error(`ffmpeg mp4 to fmp4 failed, code: ${code}`)
		}

		const outputFiles = await readOutputFiles(outputPath)
		const manifestFile = outputFiles.find((item) => item.name === 'manifest.mpd')
		if (!manifestFile) {
			throw new Error('ffmpeg 未生成 manifest.mpd')
		}

		const manifestText = new TextDecoder().decode(manifestFile.data)
		const mediaFiles = outputFiles
			.filter((item) => item.name !== 'manifest.mpd')
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
		const manifestBuffer = new TextEncoder().encode(manifestText).buffer

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
