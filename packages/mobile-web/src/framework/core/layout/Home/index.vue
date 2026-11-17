<template>
	<div class="layout-container h-full flex flex-col overflow-hidden">
		<div class="main min-h-0 flex-1" :style="{ '--background-color': theme.style.color.background }">
			<MultiLevelKeepAlive :cacheComponent="cacheComponent"></MultiLevelKeepAlive>
		</div>
		<BottomNav v-if="route.meta.isTabBar"></BottomNav>
	</div>
</template>

<script lang="ts" setup>
	import { useRoute } from 'vue-router'
	import { theme, cacheComponent } from '@/config'
	import BottomNav from '../BottomNav/index.vue'
	import MultiLevelKeepAlive from '@/framework/components/MultiLevelKeepAlive/index.vue'

	const route = useRoute()
</script>

<style scoped lang="scss">
	.main {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		box-sizing: border-box;
		background: var(--background-color);
		/* 为页面切换动画中绝对定位的离场页提供定位上下文 */
		position: relative;
	}
</style>
