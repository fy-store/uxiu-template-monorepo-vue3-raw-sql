<template>
	<el-menu :default-active="defaultActiveId" @select="select" :collapse="appCommunicate.state.isSidebarIsCollapse">
		<template v-for="it in sidebar.list">
			<DeepChildren :it></DeepChildren>
		</template>
	</el-menu>
</template>

<script lang="ts" setup>
	import { project } from '@/conf'
	import { useAppCommunicate } from '@/stores'
	import { watchEffect, ref } from 'vue'
	import { useRoute, useRouter } from 'vue-router'
	import DeepChildren from './DeepChildren.vue'

	const { sidebar } = project
	const appCommunicate = useAppCommunicate()
	const router = useRouter()
	const route = useRoute()
	const defaultActiveId = ref('')

	// 当路由加载完毕后(首次进入/刷新页面)设置侧边栏默认激活
	router.isReady().then(() => {
		watchEffect(() => {
			defaultActiveId.value = route.path
		})
	})

	// 切换菜单时, 跳转路由
	const select = (path: string, _idPath: string[]) => {
		router.push(path)
	}
</script>

<style scoped lang="scss"></style>
