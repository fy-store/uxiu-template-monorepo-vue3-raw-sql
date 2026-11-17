import type { HistoryItem, PushHistoryItem } from './types'
import type { RouteMeta, RouteLocationNormalizedLoadedGeneric } from 'vue-router'
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
	 * 判断指定 path 是否为固定标签页
	 * - 固定标签页始终存在于 nav 中, 且不可关闭
	 */
	function isFixed(path: string) {
		return !!router.resolve(path).meta.fixed
	}

	/**
	 * 解析路由标签名, 未配置时回退为 path
	 */
	function resolveTitle(meta: RouteMeta, path: string) {
		if (typeof meta.title === 'function') {
			return meta.title()
		} else if (typeof meta.title === 'string') {
			return meta.title
		}
		return path
	}

	/**
	 * 移除历史中符合条件的项, 并释放其对应缓存
	 * @param predicate 返回 true 的项将被移除
	 */
	function removeItems(predicate: (item: HistoryItem) => boolean) {
		history.value.forEach((it) => {
			if (!predicate(it)) return
			cacheComponent.cache.delete(cacheComponent.getName(it.path))
		})
		history.value.splice(
			0,
			history.value.length,
			...history.value.filter((it) => !predicate(it))
		)
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
		// 固定标签页始终存在于 nav 中
		router.getRoutes().forEach((record) => {
			if (!record.meta.fixed) return
			push({
				path: record.path,
				title: resolveTitle(record.meta, record.path),
				// 固定项仅用于展示标签, route 字段未被消费, resolve 结果转为跳转态类型即可
				route: router.resolve(record.path) as RouteLocationNormalizedLoadedGeneric
			})
		})

		watchEffect(() => {
			/**
			 * 必须先读取当前路由
			 * watchEffect 每次执行都会重新收集依赖, 若该读取放在下面的早退分支之后,
			 * 早退时便不会再订阅路由变化, 之后切换路由也不会生成新标签页
			 */
			const { path, meta } = route
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
			push({ path, title: resolveTitle(meta, path), route })
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
			// 固定标签页不可关闭
			if (!currentItem || isFixed(currentItem.path)) return
			const previousItem = history.value[i - 1]
			const nextItem = history.value[i + 1]

			// 移除指定项
			const removed = history.value.splice(i, 1)
			if (!removed.length) return
			// 生成对应名字, 从缓存中移除
			cacheComponent.cache.delete(cacheComponent.getName(removed[0]!.path))

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
			}
			// 固定标签页保留, 其余移除并释放其缓存
			removeItems((it) => !isFixed(it.path))
		},

		closeOther() {
			const currentPath = route.path
			// 固定标签页与当前页保留, 其余移除并释放其缓存
			removeItems((it) => !isFixed(it.path) && it.path !== currentPath)
			// 当前页不在历史中时补一条(例如错误页)
			push({ path: currentPath, title: resolveTitle(route.meta, currentPath), route })
		},

		isFixed
	})
})
