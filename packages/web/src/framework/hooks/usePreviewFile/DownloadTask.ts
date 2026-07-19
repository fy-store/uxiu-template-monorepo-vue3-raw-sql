import type {
	DownloadTaskOptions,
	DownloadTaskProgress,
	DownloadTaskResult,
	DownloadWorkerRequest,
	DownloadWorkerResponse
} from './downloadTaskTypes'

/** 下载任务被用户取消时抛出的错误。 */
export class DownloadTaskCanceledError extends Error {
	/**
	 * 创建下载取消错误。
	 */
	constructor() {
		super('下载任务已取消')
		this.name = 'DownloadTaskCanceledError'
	}
}

/** 下载任务回调。 */
export interface DownloadTaskCallbacks {
	/**
	 * 下载进度更新回调。
	 * @param progress 当前下载进度。
	 */
	onProgress?: (progress: DownloadTaskProgress) => void
}

/**
 * 下载 Worker 任务控制器。
 */
export class DownloadTask {
	private _worker: Worker | null = null
	private _settled = false
	private _reject: ((error: Error) => void) | null = null
	private _terminateTimer: ReturnType<typeof setTimeout> | null = null

	/**
	 * 启动下载任务。
	 * @param options 下载任务配置。
	 * @param callbacks 下载任务回调。
	 * @returns 下载结果。
	 */
	start(options: DownloadTaskOptions, callbacks: DownloadTaskCallbacks = {}) {
		if (this._worker) {
			throw new Error('下载任务已启动')
		}

		this._worker = new Worker(new URL('./downloadWorker.ts', import.meta.url), { type: 'module' })

		return new Promise<DownloadTaskResult>((resolve, reject) => {
			const finish = (callback: () => void) => {
				if (this._settled) return
				this._settled = true
				this._reject = null
				callback()
			}
			this._reject = (error) => finish(() => reject(error))

			this._worker!.onmessage = (event: MessageEvent<DownloadWorkerResponse>) => {
				const data = event.data
				if (data.type === 'progress') {
					if (this._settled) return
					callbacks.onProgress?.(data.progress)
					return
				}
				if (data.type === 'complete') {
					finish(() => resolve(data.result))
					this._terminateWorker()
					return
				}
				if (data.type === 'canceled') {
					finish(() => reject(new DownloadTaskCanceledError()))
					this._terminateWorker()
					return
				}
				if (data.type === 'error') {
					finish(() => reject(new Error(data.error)))
					this._terminateWorker()
				}
			}

			this._worker!.onerror = (event) => {
				finish(() => reject(new Error(event.message || '下载 Worker 执行失败')))
				this._terminateWorker()
			}

			this._worker!.onmessageerror = () => {
				finish(() => reject(new Error('下载 Worker 消息解析失败')))
				this._terminateWorker()
			}

			try {
				this._postMessage({
					type: 'start',
					options
				})
			} catch (error) {
				finish(() => reject(error instanceof Error ? error : new Error(String(error))))
				this._terminateWorker()
			}
		})
	}

	/**
	 * 暂停下载任务。
	 */
	pause() {
		this._postMessage({ type: 'pause' })
	}

	/**
	 * 恢复下载任务。
	 */
	resume() {
		this._postMessage({ type: 'resume' })
	}

	/**
	 * 取消下载任务。
	 */
	cancel() {
		this._postMessage({ type: 'cancel' })
		this._scheduleTerminate()
	}

	/**
	 * 请求 Worker 释放内部资源，并兜底强制终止。
	 */
	destroy() {
		if (!this._worker) return

		try {
			this._postMessage({ type: 'cancel' })
		} catch {}

		this._reject?.(new DownloadTaskCanceledError())
		this._scheduleTerminate(200)
	}

	/**
	 * 向下载 Worker 发送消息。
	 * @param message Worker 消息。
	 */
	private _postMessage(message: DownloadWorkerRequest) {
		this._worker?.postMessage(message)
	}

	/**
	 * 安排 Worker 强制终止，给内部 ffmpeg Worker 留出清理时间。
	 * @param delay 兜底终止等待时间。
	 */
	private _scheduleTerminate(delay = 1000) {
		if (!this._worker || this._terminateTimer) return

		this._terminateTimer = setTimeout(() => {
			this._reject?.(new DownloadTaskCanceledError())
			this._terminateWorker()
		}, delay)
	}

	/**
	 * 立即终止 Worker 并清除事件监听。
	 */
	private _terminateWorker() {
		if (this._terminateTimer) {
			clearTimeout(this._terminateTimer)
			this._terminateTimer = null
		}
		if (!this._worker) return

		this._worker.onmessage = null
		this._worker.onerror = null
		this._worker.onmessageerror = null
		this._worker.terminate()
		this._worker = null
	}
}
