import type { Config, EventTypes, MenuItem, OpenOptions, Options, Position } from './types'
import {
	createVNode,
	render,
	defineComponent,
	getCurrentInstance,
	h,
	markRaw,
	onBeforeUnmount,
	onMounted,
	reactive,
	ref,
	watch
} from 'vue'
import { Bus, type InterfaceToType } from 'event-imt'
import Template from './Template.vue'

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined'
const menuRootSelector = '[data-context-menu-root="true"]'

/**
 * 创建可通过事件或坐标打开的右键菜单。
 * @param op 右键菜单初始配置。
 * @returns 菜单状态、组件、控制方法和事件总线。
 */
export function useContextMenu(op: Options = {}) {
	const bus = new Bus<InterfaceToType<EventTypes>>()

	const config = ref<Config>({
		items: [],
		customClass: '',
		zIndex: 2000,
		minWidth: 160,
		offset: 2,
		closeOnClick: true,
		closeOnScroll: true,
		closeOnResize: true,
		teleport: true,
		autoMount: true,
		...op
	})

	const state = reactive({
		visible: false,
		x: 0,
		y: 0,
		items: config.value.items ?? [],
		context: null as any
	})

	let vnode: ReturnType<typeof createVNode> | null = null
	let container: HTMLDivElement | null = null
	let listening = false
	let lastOpenEventStamp: number | null = null
	let hasTemplate = false

	const ContextMenu = markRaw(
		defineComponent({
			name: 'SysContextMenu',
			/**
			 * 标记显式渲染的菜单组件已挂载。
			 */
			setup() {
				onMounted(() => {
					hasTemplate = true
				})
			},
			/**
			 * 渲染右键菜单模板。
			 * @returns 右键菜单虚拟节点。
			 */
			render() {
				return h(Template, {
					visible: state.visible,
					x: state.x,
					y: state.y,
					items: state.items,
					context: state.context,
					customClass: config.value.customClass,
					zIndex: config.value.zIndex,
					minWidth: config.value.minWidth,
					teleport: config.value.teleport,
					/**
					 * 同步模板根据视口修正后的菜单位置。
					 * @param pos 修正后的菜单坐标。
					 */
					'onUpdate:position'(pos: Position) {
						state.x = pos.x
						state.y = pos.y
					},
					/**
					 * 转发菜单项选择事件。
					 * @param item 被选择的菜单项。
					 */
					onSelect(item: MenuItem) {
						handleSelect(item)
					}
				})
			}
		})
	)

	/**
	 * 在未显式渲染 ContextMenu 时，将菜单组件挂载到 body。
	 */
	const ensureApp = () => {
		if (!isBrowser || vnode) return

		container = document.createElement('div')
		document.body.appendChild(container)
		vnode = createVNode(ContextMenu)
		render(vnode, container)
	}

	/**
	 * 卸载自动挂载的菜单组件并移除容器。
	 */
	const unmountApp = () => {
		if (!vnode || !container) return

		render(null, container)
		container.remove()
		vnode = null
		container = null
	}

	/**
	 * 注册菜单打开期间需要的全局关闭监听器。
	 * @returns 用于移除全部监听器的函数；非浏览器环境或已监听时无返回值。
	 */
	const addListeners = () => {
		if (!isBrowser || listening) return

		/**
		 * 点击菜单外部或打开另一个右键菜单时关闭当前菜单。
		 * @param event 鼠标事件。
		 */
		const onMouseDown = (event: MouseEvent) => {
			if (!state.visible) return
			if (event.type === 'contextmenu' && lastOpenEventStamp === event.timeStamp) return
			const target = event.target as HTMLElement | null
			if (target && target.closest(menuRootSelector)) return
			close()
		}

		/**
		 * 页面滚动时按配置关闭菜单。
		 */
		const onScroll = () => {
			if (config.value.closeOnScroll) close()
		}

		/**
		 * 窗口尺寸变化时按配置关闭菜单。
		 */
		const onResize = () => {
			if (config.value.closeOnResize) close()
		}

		window.addEventListener('mousedown', onMouseDown)
		window.addEventListener('contextmenu', onMouseDown)
		window.addEventListener('scroll', onScroll, true)
		window.addEventListener('resize', onResize)

		listening = true

		/**
		 * 移除当前实例注册的全部全局监听器。
		 */
		const remove = () => {
			window.removeEventListener('mousedown', onMouseDown)
			window.removeEventListener('contextmenu', onMouseDown)
			window.removeEventListener('scroll', onScroll, true)
			window.removeEventListener('resize', onResize)
			listening = false
		}

		return remove
	}

	let removeListeners: (() => void) | null = null

	/**
	 * 执行菜单项回调、派发选择事件，并按配置关闭菜单。
	 * @param item 被选择的菜单项。
	 */
	const handleSelect = (item: MenuItem) => {
		if (item.disabled) return
		item.onClick?.(item, state.context)
		if (bus.has('select')) {
			bus.emit('select', item, state.context)
		}
		if (config.value.closeOnClick) {
			close()
		}
	}

	/**
	 * 更新菜单坐标。
	 * @param position 新的菜单坐标。
	 */
	const setPosition = (position: Position) => {
		state.x = position.x
		state.y = position.y
	}

	/**
	 * 将鼠标事件或坐标转换为应用偏移量后的菜单坐标。
	 * @param posOrEvent 鼠标事件或目标坐标。
	 * @returns 应用菜单偏移量后的坐标。
	 */
	const resolvePosition = (posOrEvent: MouseEvent | Position) => {
		const offset = config.value.offset
		if (posOrEvent instanceof MouseEvent) {
			posOrEvent.preventDefault()
			return {
				x: posOrEvent.clientX + offset,
				y: posOrEvent.clientY + offset
			}
		}

		return {
			x: posOrEvent.x + offset,
			y: posOrEvent.y + offset
		}
	}

	/**
	 * 在指定鼠标位置或坐标打开菜单。
	 * @param posOrEvent 鼠标事件或目标坐标。
	 * @param options 本次打开使用的菜单项和上下文。
	 */
	const open = (posOrEvent: MouseEvent | Position, options: OpenOptions = {}) => {
		const position = resolvePosition(posOrEvent)
		lastOpenEventStamp = posOrEvent instanceof MouseEvent ? posOrEvent.timeStamp : null
		state.items = options.items ?? config.value.items ?? []
		state.context = options.context
		setPosition(position)
		state.visible = true

		if (config.value.autoMount && !hasTemplate) {
			ensureApp()
		}

		if (!removeListeners) {
			removeListeners = addListeners() ?? null
		}

		if (bus.has('open')) {
			bus.emit('open', { position, items: state.items, context: state.context })
		}
	}

	/**
	 * 关闭菜单并清理当前打开状态和全局监听器。
	 */
	const close = () => {
		if (!state.visible) return

		state.visible = false
		state.context = null
		lastOpenEventStamp = null

		if (removeListeners) {
			removeListeners()
			removeListeners = null
		}

		if (config.value.autoMount && !hasTemplate) {
			unmountApp()
		}

		if (bus.has('close')) {
			bus.emit('close')
		}
	}

	/**
	 * 创建可直接绑定到 contextmenu 事件的处理函数。
	 * @param options 每次触发时使用的打开配置。
	 * @returns contextmenu 事件处理函数。
	 */
	const bindContextMenu = (options?: OpenOptions) => {
		return (event: MouseEvent) => open(event, options)
	}

	/**
	 * 替换默认菜单项；菜单关闭时同步更新当前菜单项。
	 * @param items 新的菜单项列表。
	 */
	const setItems = (items: MenuItem[]) => {
		config.value.items = items
		if (!state.visible) {
			state.items = items
		}
	}

	watch(
		() => state.visible,
		(visible) => {
			if (visible) {
				if (!removeListeners) {
					removeListeners = addListeners() ?? null
				}
				return
			}

			if (removeListeners) {
				removeListeners()
				removeListeners = null
			}
		},
		{ flush: 'post' }
	)

	if (getCurrentInstance()) {
		onBeforeUnmount(() => {
			if (removeListeners) {
				removeListeners()
				removeListeners = null
			}
			unmountApp()
		})
	}

	return {
		bus,
		config,
		state,
		ContextMenu,
		open,
		close,
		bindContextMenu,
		setItems
	}
}
