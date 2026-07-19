<template>
	<div class="layout-container h-screen">
		<Header class="flex-shrink-0" v-if="isShow"></Header>
		<div class="flex flex-1" :style="{ height: height }">
			<el-scrollbar v-if="isShow" class="sidebar-container" :style="{ '--max-width': sidebarWidth }">
				<Sidebar v-if="sidebar.list" class="h-100% sidebar"></Sidebar>
			</el-scrollbar>
			<div class="main flex-1 h-100%" :style="{ '--background-color': theme.style.color.background }">
				<Nav class="z-1" v-if="isShow"></Nav>
				<el-scrollbar class="flex-1" view-class="h-100%">
					<MultiLevelKeepAlive :cacheComponent="cacheComponent"></MultiLevelKeepAlive>
				</el-scrollbar>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
	import { useRoute } from 'vue-router'
	import { project, layout, theme, cacheComponent } from '@/config'
	import { computed } from 'vue'
	import Header from '../Header/index.vue'
	import Sidebar from '../Sidebar/index.vue'
	import Nav from '../Nav/index.vue'
	import MultiLevelKeepAlive from '@/framework/components/MultiLevelKeepAlive/index.vue'

	const route = useRoute()
	const { sidebar } = project
	const { header } = layout

	const isShow = computed(() => {
		return route.path !== '/login'
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
	.layout-container {
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
		background: var(--background-color);
	}

	.sidebar-container {
		border-right: 1px solid var(--theme-color-border);
		max-width: var(--max-width);
		box-sizing: border-box;
	}

	.sidebar:not(.el-menu--collapse) {
		width: var(--max-width);
		height: 100%;
		box-sizing: border-box;
	}
</style>
