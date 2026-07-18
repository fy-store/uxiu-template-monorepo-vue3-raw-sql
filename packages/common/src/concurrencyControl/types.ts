export interface ConcurrencyContext {
	/** 当前正在执行的任务数量 */
	running: number
	/** 当前任务序号（从 1 开始） */
	index: number
	/**
	 * 修改并发数
	 * 最小值为 1
	 */
	setLimit(limit: number): void
	/**
	 * 结束整个并发队列
	 */
	stop(): void
}
