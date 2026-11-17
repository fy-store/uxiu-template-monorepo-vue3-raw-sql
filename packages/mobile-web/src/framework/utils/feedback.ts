import { h } from 'vue'
import { ActionSheet, Dialog, Icon, Snackbar } from '@varlet/ui'
import type { SnackbarHandel, SnackbarType } from '@varlet/ui'
import '@varlet/ui/es/action-sheet/style/index.mjs'
import '@varlet/ui/es/dialog/style/index.mjs'
import '@varlet/ui/es/icon/style/index.mjs'
import '@varlet/ui/es/snackbar/style/index.mjs'

/** 弹层与消息组件原样导出, 业务消息提示优先使用可手动关闭的 `message` */
export { ActionSheet, Snackbar }

/**
 * 弹出确认对话框, 替代 `window.confirm` 的原生样式。
 * @param content 提示内容。
 * @param title 标题, 默认为 `注意`。
 * @returns 用户是否点击了确认。
 */
export async function confirm(content: string, title = '注意') {
	const action = await Dialog({
		title,
		message: content,
		confirmButtonText: '确 认',
		cancelButtonText: '取 消'
	})
	return action === 'confirm'
}

/** 消息提示默认自动关闭时长 (毫秒), 与 Varlet Snackbar 默认值一致 */
const DEFAULT_DURATION = 3000

/**
 * 显示带手动关闭按钮的消息提示。
 * @param type 提示类型。
 * @param content 提示内容。
 * @param duration 自动关闭时长 (毫秒)。
 * @returns 消息实例, 调用 `clear()` 可提前关闭。
 */
function showMessage(type: Exclude<SnackbarType, 'loading'>, content: string, duration = DEFAULT_DURATION) {
	let handel: SnackbarHandel
	handel = Snackbar({
		type,
		content,
		duration,
		action: () => h('div', { class: 'feedback-close', onClick: () => handel.clear() }, h(Icon, { name: 'window-close' }))
	})
	return handel
}

/** 可手动关闭的消息提示, 内置关闭按钮, 自动关闭前可主动关闭 */
export const message = {
	/**
	 * 显示成功提示。
	 * @param content 提示内容。
	 * @param duration 自动关闭时长 (毫秒)。
	 */
	success(content: string, duration = DEFAULT_DURATION) {
		return showMessage('success', content, duration)
	},
	/**
	 * 显示警告提示。
	 * @param content 提示内容。
	 * @param duration 自动关闭时长 (毫秒)。
	 */
	warning(content: string, duration = DEFAULT_DURATION) {
		return showMessage('warning', content, duration)
	},
	/**
	 * 显示错误提示。
	 * @param content 提示内容。
	 * @param duration 自动关闭时长 (毫秒)。
	 */
	error(content: string, duration = DEFAULT_DURATION) {
		return showMessage('error', content, duration)
	},
	/**
	 * 显示普通提示。
	 * @param content 提示内容。
	 * @param duration 自动关闭时长 (毫秒)。
	 */
	info(content: string, duration = DEFAULT_DURATION) {
		return showMessage('info', content, duration)
	}
}
