import type { Component } from 'vue'
import type { RouteLocationNormalizedLoadedGeneric } from 'vue-router'
import type { HistoryItem, PushHistoryItem } from './types'
import { useRouter, useRoute } from 'vue-router'
import { computed, defineComponent, h, markRaw, reactive, readonly, ref, watchEffect } from 'vue'
import { defineStore } from 'pinia'
import { project } from '@/conf'

export const useRouteHistory = defineStore('routeHistory', () => {
	const router = useRouter()
	const route = useRoute()
	const cacheMap = ref(new Map<string, Component>())
	const history = ref<HistoryItem[]>([])
	/**
	 * 监听路由变化, 但记录中不存在时是否允许插入
	 */
	const isPushHistory = ref(true)
	const isPushCacheMap = ref(true)

	/**
	 * 通过路由 path 判断历史列表中存不存在
	 * @param path 路由 path
	 */
	const hasPath = (path: string) => {
		return history.value.some((item) => item.path === path)
	}

	/**
	 * 向路由历史中插入一条记录
	 * @param item 配置项
	 * @returns 如果已存在则插入失败 返回 false, 如果不存在则插入成功 返回 true
	 */
	const push = (item: PushHistoryItem) => {
		if (hasPath(item.path)) {
			return false
		}
		history.value.push({
			active: false,
			path: item.path,
			title: item.title,
			route: item.route
		})

		return true
	}

	/**
	 * 根据路由信息决定返回的组件是否需要包装缓存
	 * @param component 组件
	 */
	const getComponent = (route: RouteLocationNormalizedLoadedGeneric, component: Component) => {
		/**
		 * 防止响应式刷新重新添加
		 */
		if (!isPushCacheMap.value) {
			return null
		}
		if (!route.meta.cache) {
			return component
		}

		let name: string
		if (route.meta.generateName) {
			if (typeof route.meta.generateName === 'function') {
				name = route.meta.generateName({ router, route, component })
			} else {
				name = route.meta.generateName
			}
		} else {
			name = route.path.slice(1).replace(/\//, '-')
		}

		const mapComponent = cacheMap.value.get(name)
		if (mapComponent) {
			return mapComponent
		}

		const newComponent = defineComponent({
			name,
			render() {
				return h(component)
			}
		})

		cacheMap.value.set(name, markRaw(newComponent))
		return newComponent
	}

	/**
	 * 监听路由变化, 并更新当前激活项
	 */
	const _current = ref<HistoryItem | undefined>()
	watchEffect(() => {
		history.value.forEach((it) => {
			it.active = false
		})

		_current.value = history.value.find((it) => it.path === route.path)
		if (_current.value) {
			_current.value.active = true
		}
		_current.value = _current as unknown as HistoryItem | undefined
	})

	/**
	 * 当前激活项
	 */
	const current = computed(() => {
		return _current.value ? readonly(_current.value) : void 0
	})

	// 根据激活项设置网页标题
	watchEffect(() => {
		const titleDom = document.querySelector('head title') ?? ({} as Element)
		let title: string = ''
		if (typeof route.meta.title === 'function') {
			title = route.meta.title({ router, route })
		} else if (typeof route.meta.title === 'string') {
			title = route.meta.title
		}
		let pageTitle = project.name + (title ? ` - ${title}` : '')
		if (route.meta.pageTitle) {
			if (typeof route.meta.pageTitle === 'function') {
				pageTitle = route.meta.pageTitle({ router, route })
			} else {
				pageTitle = route.meta.pageTitle
			}
		}
		titleDom.textContent = pageTitle
	})

	// 监听路由变化, 但记录中不存在时(按前进后退), 添加到记录中
	router.isReady().then(() => {
		watchEffect(() => {
			if (route.path === '/login') return
			/**
			 * 防止本次项被删除后又从 router history 中寻找到同项加回
			 */
			if (!isPushHistory.value) {
				isPushHistory.value = true
				return
			}
			/**
			 * 放开添加缓存
			 */
			isPushCacheMap.value = true
			let title: string
			if (typeof route.meta.title === 'function') {
				title = route.meta.title({ router, route })
			} else if (typeof route.meta.title === 'string') {
				title = route.meta.title
			} else {
				title = route.path
			}
			push({ path: route.path, title, route })
		})
	})

	return reactive({
		current,
		cacheMap: readonly(cacheMap),
		history: readonly(history),
		getComponent,
		hasPath,
		changeTitle(path: string, newTitle: string) {
			const item = history.value.find((it) => it.path === path)
			if (item) {
				item.title = newTitle
				const titleDom = document.querySelector('head title') ?? ({} as Element)
				titleDom.textContent = project.name + (newTitle ? ` - ${newTitle}` : '')
			}
		},
		removeByIndex(i: number) {
			const currentItem = history.value[i]
			const previousItem = history.value[i - 1]
			const nextItem = history.value[i + 1]

			// 移除指定项
			const removeItem = history.value.splice(i, 1)
			// 生成对应名字, 从缓存中移除
			const name = removeItem[0].path.slice(1).replace(/\//, '-')
			cacheMap.value.delete(name)
			if (!previousItem) {
				if (nextItem) {
					if (currentItem.active) {
						isPushHistory.value = false
						isPushCacheMap.value = false
						if (router.currentRoute.value.path === nextItem.path) return
						router.push(nextItem.path)
					}
					return
				}
				isPushHistory.value = false
				isPushCacheMap.value = false
				router.push('/')
				return
			}
			if (currentItem.active) {
				isPushHistory.value = false
				isPushCacheMap.value = false
				if (router.currentRoute.value.path === previousItem.path) return
				router.push(previousItem.path)
			}
		},

		clear() {
			if (current.value) {
				isPushHistory.value = false
				isPushCacheMap.value = false
				router.push('/')
				history.value.splice(0)
			} else {
				history.value.splice(0)
			}
			cacheMap.value.clear()
		},

		closeOther() {
			const name: string = route.path.slice(1).replace(/\//, '-')
			const cache = cacheMap.value.get(name)
			cacheMap.value.clear()
			if (cache) {
				cacheMap.value.set(name, cache)
			}

			history.value.splice(0)
			let title: string
			if (typeof route.meta.title === 'function') {
				title = route.meta.title({ router, route })
			} else if (typeof route.meta.title === 'string') {
				title = route.meta.title
			} else {
				title = route.path
			}
			push({
				path: route.path,
				title,
				route
			})
		}
	})
})
