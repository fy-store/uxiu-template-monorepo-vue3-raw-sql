<template>
	<var-bottom-navigation
		class="bottom-nav flex-shrink-0"
		:active="active"
		:fixed="false"
		:border="true"
		safe-area
		@change="to"
	>
		<var-bottom-navigation-item
			v-for="it in sidebar.list"
			:key="it.path"
			:name="it.path"
			:label="it.title"
			:icon="it.icon"
		/>
	</var-bottom-navigation>
</template>

<script lang="ts" setup>
	import { computed } from 'vue'
	import { useRoute, useRouter } from 'vue-router'
	import { project } from '@/config'

	const router = useRouter()
	const route = useRoute()
	const { sidebar } = project

	// 标签激活状态: 优先精确匹配, 其次按前缀匹配子路由(多级路由只需在父级路由中设置 isTabBar)
	const active = computed(() => {
		const exact = sidebar.list.find((it) => it.path === route.path)
		if (exact?.path) {
			return exact.path
		}
		const parent = sidebar.list.find((it) => it.path && it.path !== '/' && route.path.startsWith(`${it.path}/`))
		return parent?.path ?? ''
	})

	/**
	 * 切换底部标签。
	 * @param name 被激活标签的 name, 即路由 path。
	 */
	function to(name: string | number) {
		if (typeof name === 'string' && name !== route.path) {
			router.push(name)
		}
	}
</script>

<style scoped lang="scss">
	.bottom-nav {
		:deep(.var-bottom-navigation-item) {
			flex: 1;
		}
	}
</style>
