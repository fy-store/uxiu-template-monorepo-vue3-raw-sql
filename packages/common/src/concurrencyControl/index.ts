import type { ConcurrencyContext } from './types'

/**
 * 并发控制执行
 * @param task 任务函数
 * @param limit 初始并发数，最小为 1
 */
/**
 * 并发控制
 *
 * @param task 回调函数
 * @param limit 初始并发数（最小为 1）, 默认为 2
 */
export function concurrencyControl(task: (ctx: ConcurrencyContext) => Promise<void> | void, limit = 2): Promise<void> {
	return new Promise((resolve, reject) => {
		if (limit < 1) {
			reject(new Error('limit must be greater than 0'))
			return
		}

		let running = 0
		let currentIndex = 0

		let stopped = false
		let finished = false

		function finish() {
			if (finished) return
			finished = true
			resolve()
		}

		function fail(error: unknown) {
			if (finished) return
			finished = true
			reject(error)
		}

		function launch() {
			if (finished) return

			if (stopped) {
				if (running === 0) {
					finish()
				}
				return
			}

			while (!stopped && !finished && running < limit) {
				const index = ++currentIndex

				running++

				const ctx: ConcurrencyContext = {
					get running() {
						return running
					},

					index,

					setLimit(value: number) {
						if (finished) return

						if (value < 1) {
							fail(new Error('limit must be greater than 0'))
							return
						}

						limit = value

						queueMicrotask(launch)
					},

					stop() {
						if (finished) return

						stopped = true

						if (running === 0) {
							finish()
						}
					}
				}

				;(async () => {
					try {
						await task(ctx)

						running--

						if (finished) return

						if (stopped) {
							if (running === 0) {
								finish()
							}
							return
						}

						launch()
					} catch (error) {
						running--
						fail(error)
					}
				})()
			}
		}

		launch()
	})
}
