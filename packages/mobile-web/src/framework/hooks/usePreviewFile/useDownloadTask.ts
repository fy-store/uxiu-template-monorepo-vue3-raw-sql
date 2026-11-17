import type {
	DownloadTaskOptions,
	DownloadTaskProgress,
	DownloadTaskResult,
	DownloadTaskStatus
} from './downloadTaskTypes'
import { getCurrentScope, onScopeDispose, ref } from 'vue'
import { DownloadTask, DownloadTaskCanceledError } from './DownloadTask'

/**
 * 创建预览文件下载任务控制器。
 * @returns 下载状态、进度和任务控制方法。
 */
export function useDownloadTask() {
	const status = ref<DownloadTaskStatus>('idle')
	const progress = ref<DownloadTaskProgress>({
		percentage: 0,
		loaded: 0,
		total: 0
	})
	let activeTask: DownloadTask | null = null

	/**
	 * 启动新的 Worker 下载任务。
	 * @param options 下载任务配置。
	 * @returns 下载结果；用户取消时返回 null。
	 */
	async function run(options: DownloadTaskOptions): Promise<DownloadTaskResult | null> {
		if (activeTask) {
			throw new Error('已有下载任务正在执行')
		}

		const task = new DownloadTask()
		activeTask = task
		status.value = 'running'
		progress.value = {
			percentage: 0,
			loaded: 0,
			total: 0
		}

		try {
			return await task.start(options, {
				onProgress(value) {
					progress.value = value
				}
			})
		} catch (error) {
			if (error instanceof DownloadTaskCanceledError) {
				return null
			}
			throw error
		} finally {
			task.destroy()
			if (activeTask === task) {
				activeTask = null
				status.value = 'idle'
			}
		}
	}

	/**
	 * 暂停或继续当前下载任务。
	 */
	function togglePause() {
		if (!activeTask) return

		if (status.value === 'running') {
			activeTask.pause()
			status.value = 'paused'
			return
		}

		if (status.value === 'paused') {
			activeTask.resume()
			status.value = 'running'
		}
	}

	/**
	 * 取消当前下载任务。
	 */
	function cancel() {
		activeTask?.cancel()
	}

	/**
	 * 终止当前下载 Worker 并清空任务状态。
	 */
	function destroy() {
		activeTask?.destroy()
		activeTask = null
		status.value = 'idle'
	}

	if (getCurrentScope()) {
		onScopeDispose(destroy)
	}

	return {
		status,
		progress,
		run,
		togglePause,
		cancel,
		destroy
	}
}
