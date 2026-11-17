import type { EventTypes, TemplateProps, PreviewOptions } from './types.ts'
import { Bus, type InterfaceToType } from 'event-imt'
import { createVNode, nextTick, render, type VNode } from 'vue'
import { waitChangeLocationIdle } from '@/frame/hooks/useChangeLocation/index.ts'
import Template from './Template.vue'

export type { DownloadMode, PreviewOptions, InitDecryptContext, PreviewInfoItem } from './types.ts'

/** 关闭动画兜底时长, 略大于弹层过渡时长(避免事件缺失时挂载点残留) */
const CLOSE_FALLBACK_DELAY = 400

/**
 * 创建文件预览控制器，通过独立容器将预览弹窗挂载到 body。
 * @returns 文件预览事件总线、打开方法和关闭方法。
 */
export function usePreviewFile() {
	const bus = new Bus<InterfaceToType<EventTypes>>()
	let vnode: VNode | null = null
	let container: HTMLDivElement | null = null
	/** 关闭动画兜底定时器, 关闭事件缺失时强制卸载 */
	const closeFallbackTimers = new Map<HTMLDivElement, number>()
	/** 关闭完成后需要派发 close 事件的挂载点 */
	const pendingCloseEvents = new Set<HTMLDivElement>()

	/**
	 * 清理挂载点的关闭兜底定时器。
	 * @param target 预览挂载点。
	 */
	function clearCloseFallback(target: HTMLDivElement) {
		const timer = closeFallbackTimers.get(target)
		if (timer === undefined) return
		window.clearTimeout(timer)
		closeFallbackTimers.delete(target)
	}

	/**
	 * 卸载指定挂载点并清理关闭状态。
	 * @param target 预览挂载点。
	 */
	function unmountContainer(target: HTMLDivElement | null) {
		if (!target) return
		clearCloseFallback(target)
		pendingCloseEvents.delete(target)
		render(null, target)
		target.remove()
		if (container === target) {
			container = null
			vnode = null
		}
	}

	/**
	 * 关闭动画结束后卸载预览, 并按需派发 close 事件。
	 * @param target 预览挂载点。
	 */
	function finishClose(target: HTMLDivElement) {
		const wasActive = container === target
		const emitEvent = pendingCloseEvents.delete(target)
		unmountContainer(target)
		if (wasActive && emitEvent && bus.has('close')) {
			bus.emit('close')
		}
	}

	/**
	 * 触发弹层关闭过渡, 并在动画结束后卸载预览。
	 * @param target 预览挂载点。
	 * @param emitCloseEvent 关闭完成后是否派发 close 事件。
	 */
	function closeWithAnimation(target: HTMLDivElement, emitCloseEvent: boolean) {
		if (emitCloseEvent) {
			pendingCloseEvents.add(target)
		}

		// 由控制器主动触发关闭过渡; 弹窗自身关闭时过渡已开始, 无需重复触发
		const instance = vnode?.component
		if (instance && instance.props.visible) {
			instance.props.visible = false
		}

		clearCloseFallback(target)
		closeFallbackTimers.set(
			target,
			window.setTimeout(() => finishClose(target), CLOSE_FALLBACK_DELAY)
		)
	}

	/**
	 * 关闭当前预览并卸载预览组件, 地址栏参数由弹窗组件的地址同步逻辑移除。
	 * @param emitCloseEvent 关闭动画结束后是否派发 close 事件。
	 */
	function closePreview(emitCloseEvent: boolean) {
		const target = container
		if (target) {
			closeWithAnimation(target, emitCloseEvent)
		}
	}

	/**
	 * 关闭当前预览并卸载预览组件。
	 */
	function close() {
		closePreview(false)
	}

	return {
		bus,
		/**
		 * 打开文件预览；已有预览时会先关闭旧实例。
		 * @param options 文件地址、名称、类型及可选解密配置。
		 */
		async preview(options: PreviewOptions) {
			if (container) {
				closePreview(false)
				// 等待旧实例的地址回退完成, 避免回退过程干扰新实例的打开
				await nextTick()
				await waitChangeLocationIdle()
			}

			const currentContainer = document.createElement('div')
			const props: TemplateProps = {
				url: options.url,
				name: options.name,
				ext: options.ext,
				isFragment: options.isFragment ?? false,
				isEncrypted: options.isEncrypted ?? false,
				fragments: options.fragments,
				visible: false,
				meta: options.meta,
				infoItems: options.infoItems,
				customClass: options.customClass,
				file: options.file,
				password: options.password,
				credentials: options.credentials ?? 'same-origin',
				closeOnBack: options.closeOnBack,
				initDecrypt: options.initDecrypt,
				/**
				 * 响应预览组件的显隐更新，关闭时播放关闭动画并派发 close 事件。
				 * @param v 预览弹窗的新显示状态。
				 */
				'onUpdate:visible'(v: boolean) {
					if (!v && container) {
						closePreview(true)
					}
				},
				/** 弹层关闭过渡结束后卸载挂载点 */
				onClosed() {
					finishClose(currentContainer)
				}
			}

			container = currentContainer
			document.body.appendChild(currentContainer)
			const currentVNode = createVNode(Template, props)
			vnode = currentVNode
			render(currentVNode, currentContainer)

			// 首帧渲染完成后再显示, 保证底部弹层的入场动画能够播放
			nextTick(() => {
				if (container === currentContainer && currentVNode.component) {
					currentVNode.component.props.visible = true
				}
			})

			if (bus.has('preview')) {
				bus.emit('preview', vnode)
			}
		},
		close
	}
}
