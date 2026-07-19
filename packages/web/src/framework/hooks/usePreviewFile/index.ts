import type { EventTypes, TemplateProps, PreviewOptions } from './types'
import { Bus, type InterfaceToType } from 'event-imt'
import { createVNode, render, type VNode } from 'vue'
import Template from './Template.vue'

export type { DownloadMode, PreviewOptions, InitDecryptContext } from './types'

/**
 * 创建文件预览控制器，通过独立容器将预览弹窗挂载到 body。
 * @returns 文件预览事件总线、打开方法和关闭方法。
 */
export function usePreviewFile() {
	const bus = new Bus<InterfaceToType<EventTypes>>()
	let vnode: VNode | null = null
	let container: HTMLDivElement | null = null

	/**
	 * 关闭当前预览并卸载预览组件。
	 */
	function close() {
		if (container) {
			render(null, container)
			container.remove()
			container = null
			vnode = null
		}
	}

	return {
		bus,
		/**
		 * 打开文件预览；已有预览时会先关闭旧实例。
		 * @param options 文件地址、名称、类型及可选解密配置。
		 */
		async preview(options: PreviewOptions) {
			if (container) {
				close()
			}

			const props: TemplateProps = {
				url: options.url,
				name: options.name,
				ext: options.ext,
				isFragment: options.isFragment ?? false,
				isEncrypted: options.isEncrypted ?? false,
				visible: true,
				meta: options.meta,
				customClass: options.customClass,
				file: options.file,
				password: options.password,
				initDecrypt: options.initDecrypt,
				/**
				 * 响应预览组件的显隐更新，关闭时清理挂载节点并派发 close 事件。
				 * @param v 预览弹窗的新显示状态。
				 */
				'onUpdate:visible'(v: boolean) {
					if (!v && container) {
						close()
						if (bus.has('close')) {
							bus.emit('close')
						}
					}
				}
			}

			container = document.createElement('div')
			document.body.appendChild(container)
			vnode = createVNode(Template, props)
			render(vnode, container)

			if (bus.has('preview')) {
				bus.emit('preview', vnode)
			}
		},
		close
	}
}
