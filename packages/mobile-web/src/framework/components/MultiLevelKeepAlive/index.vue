<template>
	<router-view v-slot="{ Component, route }">
		<transition :name="getTransitionName(route)">
			<keep-alive :include="keepAliveList">
				<component :is="props.cacheComponent.getComponent(route, Component, currentIndex)" />
			</keep-alive>
		</transition>
	</router-view>
</template>

<script lang="ts" setup>
	/**
	 * 一个用于根据路由记录动态生成并缓存组件的组件。
	 * - 通过路由 meta.cache 决定是否缓存组件
	 * - 通过路由 meta.generateName 定义缓存组件的名称
	 * - 通过路由 meta.isTransition 控制页面切换动画, 默认为开启
	 * - 需要配合 `packages\mobile-web\src\framework\utils\cacheComponent` 工具类使用，以实现多层级路由的组件缓存功能
	 */
	import { type CacheComponent } from '@/framework/utils'
	import { sidebarList } from '@/config'
	import { computed, inject, onBeforeUnmount, ref, unref } from 'vue'
	import { useRouter, viewDepthKey } from 'vue-router'
	import type { RouteLocationNormalized, RouteLocationNormalizedLoadedGeneric } from 'vue-router'
	const props = defineProps<{ cacheComponent: CacheComponent; index?: number }>()
	const router = useRouter()
	// 获取当前路由的嵌套层级
	const depth = inject(viewDepthKey, 0)
	const currentIndex = computed(() => {
		return props.index ?? unref(depth)
	})

	const keepAliveList = computed(() => {
		return Array.from(props.cacheComponent.cache.keys())
	})

	// 页面切换动画方向: app-slide-left 新页面从右侧进入, app-slide-right 新页面从左侧进入
	const transitionName = ref('app-slide-left')

	/** 获取浏览器历史栈位置 */
	function getHistoryPosition() {
		const { state } = window.history
		if (state && typeof state.position === 'number') {
			return state.position
		}
		return 0
	}

	let lastHistoryPosition = getHistoryPosition()
	const removeAfterEach = router.afterEach((to, from) => {
		const currentHistoryPosition = getHistoryPosition()
		const isBack = currentHistoryPosition < lastHistoryPosition
		lastHistoryPosition = currentHistoryPosition
		transitionName.value = resolveTransitionName(to, from, isBack)
	})
	onBeforeUnmount(() => {
		removeAfterEach()
	})

	/**
	 * 获取路由对应的 tabbar 下标。
	 * @param path 路由 path
	 * @returns tabbar 下标; 非 tabbar 页面返回 -1
	 */
	function getTabIndex(path: string) {
		return sidebarList.value.findIndex((it) => it.path === path)
	}

	/**
	 * 计算本次页面切换的动画名称。
	 * - tabbar 页面之间切换: 目标下标大于来源下标时新页面从右侧进入, 否则从左侧进入
	 * - 其余情况: 目标页面已缓存过时新页面从左侧进入(相当于回到缓存页面)
	 * - 其余情况保持历史栈方向: 后退时从左侧进入, 前进时从右侧进入
	 * @param to 目标路由
	 * @param from 来源路由
	 * @param isBack 是否为后退导航
	 * @returns 过渡类名, app-slide-left 为从右侧进入, app-slide-right 为从左侧进入
	 */
	function resolveTransitionName(to: RouteLocationNormalized, from: RouteLocationNormalized, isBack: boolean) {
		const toTabIndex = getTabIndex(to.path)
		const fromTabIndex = getTabIndex(from.path)
		if (toTabIndex !== -1 && fromTabIndex !== -1) {
			return toTabIndex > fromTabIndex ? 'app-slide-left' : 'app-slide-right'
		}
		if (props.cacheComponent.hasCache(to)) {
			return 'app-slide-right'
		}
		return isBack ? 'app-slide-right' : 'app-slide-left'
	}

	/**
	 * 获取当前页面切换动画名称。
	 * - 匹配链路上任意路由的 meta.isTransition 为 false 时, 关闭动画
	 * @param routeInfo 当前渲染路由
	 * @returns 过渡类名, 返回空字符串表示关闭过渡
	 */
	function getTransitionName(routeInfo: RouteLocationNormalizedLoadedGeneric) {
		if (routeInfo.matched.some((it) => it.meta.isTransition === false)) {
			return ''
		}
		return transitionName.value
	}
</script>

<style scoped lang="scss">
	.app-slide-left-enter-active,
	.app-slide-left-leave-active,
	.app-slide-right-enter-active,
	.app-slide-right-leave-active {
		transition:
			transform 0.28s cubic-bezier(0.22, 0.61, 0.36, 1),
			opacity 0.28s ease;
	}

	.app-slide-left-enter-active,
	.app-slide-right-enter-active {
		z-index: 2;
	}

	/* 离场页面脱离文档流, 使进出场页面可以同时展示 */
	.app-slide-left-leave-active,
	.app-slide-right-leave-active {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		z-index: 1;
	}

	/* app-slide-left: 新页面从右侧滑入, 旧页面向左滑出 */
	.app-slide-left-enter-from {
		opacity: 1;
		transform: translateX(100%);
	}

	.app-slide-left-leave-to {
		opacity: 0.95;
		transform: translateX(-100%);
	}

	/* app-slide-right: 新页面从左侧滑入, 旧页面向右滑出 */
	.app-slide-right-enter-from {
		opacity: 1;
		transform: translateX(-100%);
	}

	.app-slide-right-leave-to {
		opacity: 0.95;
		transform: translateX(100%);
	}

	.app-slide-left-enter-to,
	.app-slide-left-leave-from,
	.app-slide-right-enter-to,
	.app-slide-right-leave-from {
		opacity: 1;
		transform: translateX(0);
	}
</style>
