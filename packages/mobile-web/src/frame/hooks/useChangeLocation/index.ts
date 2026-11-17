import type { Options } from './types'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import router from '@/router'

/** 历史记录 state 中标记参数来源的字段名 */
const HISTORY_STATE_FLAG = '__changeLocationKey__'

/** 等待路由回退到位的兜底时长(毫秒), 仅用于回退导航未触发时避免队列卡死 */
const WAIT_FALLBACK_DELAY = 500

/** open/close 任务串行队列, 避免连续操作导致历史记录交错 */
let pendingTask: Promise<unknown> = Promise.resolve()

/**
 * 等待所有进行中的地址同步任务完成。
 * 用于需要在地址状态稳定后再衔接后续操作的场景, 如连续切换预览实例。
 * @returns 任务队列空闲后的完成回调。
 */
export function waitChangeLocationIdle() {
	return pendingTask
}

/**
 * 将任务追加至串行队列, 前一个任务结束后再执行, 执行异常不会中断后续任务。
 * @param task 待执行的任务。
 * @returns 当前任务的完成回调。
 */
function enqueue(task: () => Promise<void>) {
	const result = pendingTask.then(task).catch(() => {})
	pendingTask = result
	return result
}

/**
 * 等待一次路由变化结束, 用于监听浏览器回退这类无法直接 await 的导航。
 */
function waitRouteChange() {
	return new Promise<void>((resolve) => {
		let settled = false
		let timer = 0
		/** 路由变化完成或超时后结束等待 */
		const done = () => {
			if (settled) return
			settled = true
			window.clearTimeout(timer)
			removeAfterEach()
			resolve()
		}
		const removeAfterEach = router.afterEach(done)
		timer = window.setTimeout(done, WAIT_FALLBACK_DELAY)
	})
}

/**
 * 将布尔状态同步到地址栏参数, 参数存在时视为激活。
 * - 打开时保留现有参数并追加一条历史记录, 参数值固定为 `1`
 * - 关闭时优先回退由本 hook 追加的历史记录, 无法回退时替换当前记录
 * - 配合系统返回键与浏览器返回键可实现返回关闭
 * @param key 地址栏参数名, 同一页面同时使用的多个实例需保持唯一。
 * @param op 可选配置。
 * @returns 激活状态与打开、关闭、切换方法。
 */
export function useChangeLocation(key: MaybeRefOrGetter<string>, op: Options = {}) {
	/** 是否启用地址同步, 默认启用 */
	const isEnabled = () => op.enabled === undefined || toValue(op.enabled)
	/** 当前路由查询参数中是否已存在目标参数 */
	const isActive = () => router.currentRoute.value.query[toValue(key)] != null
	/** 当前历史记录是否由本 hook 追加, 是则可通过回退移除参数 */
	const isPushedEntry = () => {
		const state = window.history.state as Record<string, unknown> | null
		return state?.[HISTORY_STATE_FLAG] === toValue(key)
	}

	/** 目标参数是否在地址栏中激活 */
	const visible = computed(() => isEnabled() && isActive())

	/** 追加地址栏参数并新增一条历史记录 */
	function open() {
		return enqueue(async () => {
			if (!isEnabled() || isActive()) return
			const locationKey = toValue(key)
			await router.push({
				query: { ...router.currentRoute.value.query, [locationKey]: '1' },
				state: { [HISTORY_STATE_FLAG]: locationKey }
			})
		})
	}

	/** 移除地址栏参数, 来源历史记录可回退时优先回退 */
	function close() {
		return enqueue(async () => {
			if (!isEnabled() || !isActive()) return
			const locationKey = toValue(key)
			if (isPushedEntry()) {
				router.back()
				await waitRouteChange()
				return
			}
			await router.replace({
				query: { ...router.currentRoute.value.query, [locationKey]: undefined },
				state: { [HISTORY_STATE_FLAG]: undefined }
			})
		})
	}

	/** 切换地址栏参数状态 */
	function toggle() {
		return visible.value ? close() : open()
	}

	return { visible, open, close, toggle }
}
