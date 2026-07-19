import { ComputeHash } from '@common/computeHash'
import type {
	FileSliceManageComputeFileHashOptions,
	FileSliceManageComputeFileHashResult,
	FileSliceManageComputeFileHashInfo,
	FileSliceManageEncriptSliceFromFileCallback,
	FileSliceManageEncriptFileOptions,
	FileSliceManageVideoInfo,
	FileSliceManageWorkerMessage,
	FileSliceManagePostBlobHashMessageToWorker,
	FileSliceManagePostEncriptBlobMessageToWorker,
	FileSliceManageMp4ToDashFmp4Options
} from './types'
import { mp4ToDashFmp4 } from './ffmpegMp4ToFmp4'

export class FileSliceManage {
	/**
	 * 获取计算文件 hash 值的 worker 数量
	 * @param chunkCount 分片数量
	 * @returns 计算文件 hash 值的 worker 数量
	 */
	private _getComputeFileHashShouldWorkerCount(chunkCount: number) {
		return Math.min(chunkCount, navigator.hardwareConcurrency || 1)
	}

	/**
	 * 创建 worker
	 * @param workerUrl worker 路径
	 * @param type worker 类型
	 * @returns worker 实例
	 */
	private _createWorker() {
		return new Worker(new URL('./worker/index.ts', import.meta.url), { type: 'module' })
	}

	/**
	 * 计算文件 hash 值
	 * @param file 文件
	 * @param options 选项
	 * @param options.chunkSize 每个分片的大小, 默认 5MB
	 * @param options 选项
	 * @returns 文件 hash 信息
	 */
	async computeFileHash(file: File, options?: FileSliceManageComputeFileHashOptions) {
		const { chunkSize = 1024 * 1024 * 5 } = options ?? {}
		const chunkCount = Math.ceil(file.size / chunkSize)
		const shouldWorkerCount = this._getComputeFileHashShouldWorkerCount(chunkCount)
		const workers = Array.from({ length: shouldWorkerCount }, () => this._createWorker())
		return new Promise<FileSliceManageComputeFileHashResult>((resolve, reject) => {
			const hashInfoList: FileSliceManageComputeFileHashInfo[] = []
			let curSize = 0
			let curIndex = 0
			workers.forEach((worker) => {
				worker.onerror = (error) => {
					workers.forEach((worker) => worker.terminate())
					reject(error)
				}
				worker.onmessage = async (event) => {
					const data: FileSliceManageWorkerMessage = event.data
					try {
						if (data.type === 'blobHash') {
							const payload = data.payload
							hashInfoList.push(payload)
							if (hashInfoList.length === chunkCount) {
								workers.forEach((worker) => worker.terminate())
								const sortHashInfoList = hashInfoList.sort((a, b) => a.index - b.index)
								const computeHash = new ComputeHash()
								const result: FileSliceManageComputeFileHashResult = {
									hashInfoList: sortHashInfoList,
									fileHash: await computeHash.getHashFromText(sortHashInfoList.map((info) => info.hash).join('-'))
								}
								resolve(result)
								return
							}
							if (curIndex < chunkCount) {
								const postData: FileSliceManagePostBlobHashMessageToWorker = {
									type: 'computeHash',
									payload: {
										index: curIndex,
										blob: file.slice(curSize, curSize + chunkSize)
									}
								}
								worker.postMessage(postData)
								curSize += chunkSize
								curIndex++
							}
							return
						}
					} catch (err) {
						workers.forEach((worker) => worker.terminate())
						reject(err)
					}
				}

				const postData: FileSliceManagePostBlobHashMessageToWorker = {
					type: 'computeHash',
					payload: {
						index: curIndex,
						blob: file.slice(curSize, curSize + chunkSize)
					}
				}
				worker.postMessage(postData)
				curSize += chunkSize
				curIndex++
			})
		})
	}

	/**
	 * 文件分片加密
	 * @param file 文件
	 * @param key 加密密钥
	 * @param callback 加密回调
	 * @param options 加密选项
	 * @returns 加密完成
	 */
	encriptSliceFromFile(
		file: File,
		key: string,
		callback: FileSliceManageEncriptSliceFromFileCallback,
		options?: FileSliceManageEncriptFileOptions
	) {
		const { chunkSize = 1024 * 1024 * 5 } = options ?? {}
		const chunkCount = Math.ceil(file.size / chunkSize)
		const shouldWorkerCount = this._getComputeFileHashShouldWorkerCount(chunkCount)
		const workers = Array.from({ length: shouldWorkerCount }, () => this._createWorker())
		return new Promise<void>((resolve, reject) => {
			let curSize = 0
			let finishCount = 0
			let curIndex = 0
			workers.forEach((worker) => {
				worker.onerror = (error) => {
					workers.forEach((worker) => worker.terminate())
					reject(error)
				}
				worker.onmessage = async (event) => {
					const data: FileSliceManageWorkerMessage = event.data
					if (data.type === 'encriptBlob') {
						const { index, encriptBuffer, originBlob } = data.payload
						const next = () => {
							finishCount++

							if (finishCount === chunkCount) {
								workers.forEach((worker) => worker.terminate())
								resolve()
								return
							}
							if (curIndex < chunkCount) {
								const postData: FileSliceManagePostEncriptBlobMessageToWorker = {
									type: 'encriptBlob',
									payload: {
										index: curIndex,
										blob: file.slice(curSize, curSize + chunkSize),
										key
									}
								}
								worker.postMessage(postData)
								curSize += chunkSize
								curIndex++
							}
						}
						callback({ index, originBlob, encriptBuffer }, next)
						return
					}
				}

				const postData: FileSliceManagePostEncriptBlobMessageToWorker = {
					type: 'encriptBlob',
					payload: {
						index: curIndex,
						blob: file.slice(curSize, curSize + chunkSize),
						key
					}
				}
				worker.postMessage(postData)
				curSize += chunkSize
				curIndex++
			})
		})
	}

	/**
	 * 使用 ffmpeg 将 MP4 转为标准 DASH fMP4 文件集合。
	 * @param file MP4 文件
	 * @param options 转换选项
	 */
	mp4ToDashFmp4(file: File, options: FileSliceManageMp4ToDashFmp4Options = {}) {
		return mp4ToDashFmp4(file, options)
	}

	/**
	 * 获取视频信息
	 * @param file 视频文件
	 * @returns 视频信息
	 */
	getVideoInfo(file: File) {
		return new Promise<FileSliceManageVideoInfo>((resolve, reject) => {
			const video = document.createElement('video')
			video.preload = 'metadata'

			video.onloadedmetadata = () => {
				const result: FileSliceManageVideoInfo = {
					duration: video.duration,
					width: video.videoWidth,
					height: video.videoHeight
				}
				URL.revokeObjectURL(video.src)
				resolve(result)
			}

			video.onerror = () => {
				URL.revokeObjectURL(video.src)
				reject(new Error('video parse fail'))
			}
			video.src = URL.createObjectURL(file)
		})
	}

	/**
	 * 检查文件是否为 MP4 视频
	 * @param file 文件
	 * @returns 是否为 MP4
	 */
	isMp4File(file: File): boolean {
		return file.type.startsWith('video/') || file.name.toLowerCase().endsWith('.mp4')
	}
}
