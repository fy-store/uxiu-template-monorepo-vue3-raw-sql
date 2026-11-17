<template>
	<div class="layout-container h-screen">
		<aside v-if="isShow" class="sidebar-container flex flex-shrink-0 flex-col" :style="{ width: sidebarWidth }">
			<div class="sidebar-logo flex items-center" :class="{ 'is-collapse': isCollapse }">
				<div class="logo-mark" @click="router.push('/')">
					<img v-if="project.logo" class="logo-img" :src="project.logo" alt="logo" />
					<span v-else>{{ project.name.slice(0, 1) }}</span>
				</div>
				<span v-show="!isCollapse" class="logo-title">{{ project.name }}</span>
				<el-icon class="collapse-btn" @click="toggleSidebar">
					<i-ep-fold v-show="!isCollapse"></i-ep-fold>
					<i-ep-expand v-show="isCollapse"></i-ep-expand>
				</el-icon>
			</div>
			<el-scrollbar class="min-h-0 flex-1">
				<Sidebar v-if="sidebar.list"></Sidebar>
			</el-scrollbar>
		</aside>
		<div class="main flex min-w-0 flex-1 flex-col" :style="{ '--background-color': theme.style.color.background }">
			<Header v-if="isShow" class="flex-shrink-0"></Header>
			<Nav v-if="isShow" class="z-1"></Nav>
			<el-scrollbar class="min-h-0 flex-1" view-class="h-100%">
				<MultiLevelKeepAlive :cacheComponent="cacheComponent"></MultiLevelKeepAlive>
			</el-scrollbar>
		</div>
	</div>
</template>

<script lang="ts" setup>
	import { useRoute, useRouter } from 'vue-router'
	import { project, layout, theme, cacheComponent } from '@/config'
	import { computed } from 'vue'
	import { useAppCommunicate } from '@/stores'
	import Header from '../Header/index.vue'
	import Sidebar from '../Sidebar/index.vue'
	import Nav from '../Nav/index.vue'
	import MultiLevelKeepAlive from '@/frame/components/MultiLevelKeepAlive/index.vue'

	const route = useRoute()
	const router = useRouter()
	const appCommunicate = useAppCommunicate()
	const { sidebar } = project

	const isShow = computed(() => {
		return route.path !== '/login'
	})

	const isCollapse = computed(() => appCommunicate.state.isSidebarIsCollapse)

	const sidebarWidth = computed(() => {
		if (isCollapse.value) return '64px'
		return layout.sidebar.width
	})

	/** 切换侧边栏收缩状态 */
	function toggleSidebar() {
		appCommunicate.changeSidebarIsCollapse(!isCollapse.value)
	}
</script>

<style scoped lang="scss">
	.layout-container {
		display: flex;
		overflow: hidden;
		box-sizing: border-box;
	}

	.sidebar-container {
		overflow: hidden;
		border-right: 1px solid var(--theme-color-border);
		background: var(--theme-color-surface);
		box-sizing: border-box;
		transition: width 0.2s;
	}

	.sidebar-logo {
		flex-shrink: 0;
		gap: 10px;
		height: 60px;
		padding: 0 12px 0 16px;
		overflow: hidden;
		border-bottom: 1px solid var(--theme-color-border);
		box-sizing: border-box;

		&.is-collapse {
			flex-direction: column;
			justify-content: center;
			gap: 2px;
			padding: 4px 0;
		}
	}

	.logo-mark {
		display: flex;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		overflow: hidden;
		border-radius: 8px;
		background: var(--theme-color-primary);
		color: #fff;
		font-size: 16px;
		font-weight: 600;
		cursor: pointer;
	}

	.logo-img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.logo-title {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		color: var(--theme-color-text);
		font-size: 15px;
		font-weight: 600;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.collapse-btn {
		flex-shrink: 0;
		margin-left: auto;
		color: var(--theme-color-text-secondary);
		font-size: 16px;
		cursor: pointer;

		.is-collapse & {
			margin-left: 0;
			font-size: 12px;
		}
	}

	.main {
		overflow: hidden;
		background: var(--background-color);
	}
</style>
