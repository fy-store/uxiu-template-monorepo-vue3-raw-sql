import type { Options, Config, EventTypes } from './types'
import { ref, reactive, h, defineComponent, onActivated, markRaw } from 'vue'
import Template from './Template.vue'
import { Bus, type InterfaceToType } from 'event-imt'

/**
 * 创建分页状态、分页组件和分页变更事件总线。
 * @param op 分页初始配置。
 * @returns 包含分页状态、配置、组件和事件总线的响应式对象。
 */
export function usePagination(op: Options = {}) {
	const bus = new Bus<InterfaceToType<EventTypes>>()

	const config = ref<Config>({
		pageSizes: [1, 10, 20, 30, 40, 50, 100, 200, 300, 400, 500, 1000, 1500, 2000],
		layout: 'total, sizes, prev, pager, next, jumper',
		immediate: true,
		activatedEmit: true,
		pagingConfig: {
			page: 1,
			size: 20,
			count: 0
		},
		...op
	})

	const info = reactive({
		bus,
		paging: config.value.pagingConfig,
		options: config,
		Pagination: markRaw(
			defineComponent({
				/**
				 * 渲染绑定当前分页配置的 Element Plus 分页组件。
				 * @returns 分页组件虚拟节点。
				 */
				render() {
					return h(Template, {
						config: config.value,
						/**
						 * 更新当前页并触发 change 事件。
						 * @param page 新的页码。
						 */
						'onUpdate:current-page'(page: number) {
							config.value.pagingConfig!.page = page
							bus.emit('change', config.value.pagingConfig)
						},
						/**
						 * 更新每页数量并触发 change 事件。
						 * @param size 新的每页数量。
						 */
						'onUpdate:page-size'(size: number) {
							config.value.pagingConfig!.size = size
							bus.emit('change', config.value.pagingConfig)
						}
					})
				}
			})
		)
	})

	if (config.value.getList) {
		bus.on('change', config.value.getList)
	}

	if (config.value.activatedEmit) {
		onActivated(() => {
			bus.emit('change', config.value.pagingConfig!)
		})
	}

	if (config.value.immediate) {
		Promise.resolve().then(() => {
			bus.emit('change', config.value.pagingConfig!)
		})
	}

	return info
}
