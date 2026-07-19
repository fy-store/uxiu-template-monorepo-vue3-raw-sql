import type { HistoryItem, PushHistoryItem } from './types'
import { useRouter, useRoute } from 'vue-router'
import { computed, reactive, readonly, ref, watchEffect } from 'vue'
import { defineStore } from 'pinia'
import { project, cacheComponent } from '@/config'

export const useRouteHistory = defineStore('routeHistory', () => {
	const router = useRouter()
	const route = useRoute()
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
	function hasPath(path: string) {
		return history.value.some((item) => item.path === path)
	}

	/**
	 * 向路由历史中插入一条记录
	 * @param item 配置项
	 * @returns 如果已存在则插入失败 返回 false, 如果不存在则插入成功 返回 true
	 */
	function push(item: PushHistoryItem) {
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
			title = route.meta.title()
		} else if (typeof route.meta.title === 'string') {
			title = route.meta.title
		}
		let pageTitle = project.name + (title ? ` - ${title}` : '')
		if (route.meta.pageTitle) {
			if (typeof route.meta.pageTitle === 'function') {
				pageTitle = route.meta.pageTitle()
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
				title = route.meta.title()
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
		hasPath,
		history: readonly(history),

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
			const removeItems = history.value.splice(i, 1)
			if (!removeItems) return
			// 生成对应名字, 从缓存中移除
			const name = cacheComponent.getName(removeItems.at(0)!.path)
			cacheComponent.cache.delete(name)

			if (!previousItem) {
				if (nextItem) {
					if (currentItem?.active) {
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
			if (currentItem?.active) {
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
			cacheComponent.cache.clear()
		},

		closeOther() {
			const name: string = cacheComponent.getName(route.path)
			const cache = cacheComponent.cache.get(name)
			cacheComponent.cache.clear()
			if (cache) {
				cacheComponent.cache.set(name, cache)
			}

			history.value.splice(0)
			let title: string
			if (typeof route.meta.title === 'function') {
				title = route.meta.title()
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
