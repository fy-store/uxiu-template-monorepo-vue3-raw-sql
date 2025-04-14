<template>
	<div class="container vh-100">
		<Header class="flex-shrink-0" v-if="isShow"></Header>
		<div class="flex flex-1" :style="{ height: height }">
			<el-scrollbar v-if="isShow">
				<Sidebar v-if="sidebar.list" class="h-100-p sidebar" :style="{ '--max-width': sidebarWidth }"></Sidebar>
			</el-scrollbar>
			<div class="main flex-1 h-100-p" :style="{ '--background-color': layout.main.backgroundColor }">
				<Nav class="z-index-1" v-if="isShow"></Nav>
				<el-scrollbar class="flex-1" view-class="h-100-p">
					<router-view v-slot="{ Component, route }">
						<keep-alive :include="keepAliveList">
							<component :is="routeHistory.getComponent(route, Component)" />
						</keep-alive>
					</router-view>
				</el-scrollbar>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
	import { useRoute } from 'vue-router'
	import { project, layout } from '@/conf'
	import { computed } from 'vue'
	import { useRouteHistory } from '@/stores'
	import Header from '@/components/Header/index.vue'
	import Sidebar from '@/components/Sidebar/index.vue'
	import Nav from '@/components/Nav/index.vue'

	const route = useRoute()
	const routeHistory = useRouteHistory()
	const { sidebar } = project
	const { header } = layout

	const isShow = computed(() => {
		return route.path !== '/login'
	})

	// 缓存路由历史中存在 name 的组件
	const keepAliveList = computed(() => {
		const keys = routeHistory.cacheMap.keys()
		return Array.from(keys)
	})

	const height = computed(() => {
		return `calc(100% - ${header.height})`
	})

	const sidebarWidth = computed(() => {
		if (!layout.sidebar.width) return ''
		return layout.sidebar.width
	})
</script>

<style scoped lang="scss">
	.container {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		box-sizing: border-box;
	}

	.side-bar-container,
	.main {
		display: flex;
		flex-direction: column;
		overflow: auto;
		box-sizing: border-box;
	}

	.main {
		background-color: var(--background-color);
	}

	.sidebar:not(.el-menu--collapse) {
		width: var(--max-width);
	}
</style>
