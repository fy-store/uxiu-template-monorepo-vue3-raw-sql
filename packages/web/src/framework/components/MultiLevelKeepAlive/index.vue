<template>
	<router-view v-slot="{ Component, route }">
		<keep-alive :include="keepAliveList">
			<component :is="props.cacheComponent.getComponent(route, Component, currentIndex)" />
		</keep-alive>
	</router-view>
</template>

<script lang="ts" setup>
	/**
	 * 一个用于根据路由记录动态生成并缓存组件的组件。
	 * - 通过路由 meta.cache 决定是否缓存组件
	 * - 通过路由 meta.generateName 定义缓存组件的名称
	 * - 需要配合 `packages\web\src\framework\utils\cacheComponent` 工具类使用，以实现多层级路由的组件缓存功能
	 */
	import { type CacheComponent } from '@/framework/utils'
	import { computed, inject, unref } from 'vue'
	import { viewDepthKey } from 'vue-router'
	const props = defineProps<{ cacheComponent: CacheComponent; index?: number }>()
	// 获取当前路由的嵌套层级
	const depth = inject(viewDepthKey, 0)
	const currentIndex = computed(() => {
		return props.index ?? unref(depth)
	})

	const keepAliveList = computed(() => {
		return Array.from(props.cacheComponent.cache.keys())
	})
</script>

<style scoped lang="scss"></style>
