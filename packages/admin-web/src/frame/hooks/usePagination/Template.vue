<template>
	<el-pagination
		:page-sizes="config.pageSizes"
		:layout="config.layout"
		:current-page="config.pagingConfig.page"
		:page-size="config.pagingConfig.size"
		:total="config.pagingConfig.count"
		:class="config.customClass"
		@update:current-page="emit('update:current-page', $event)"
		@update:page-size="emit('update:page-size', $event)"
		v-bind="{ ...(config.paginationProps ?? {}), ...$attrs }"
		v-on="config.paginationEvents ?? {}"
	/>
</template>

<script lang="ts" setup>
	import type { Config } from './types'

	const { config } = defineProps<{ config: Config }>()
	const emit = defineEmits<{
		/**
		 * 派发当前页更新。
		 * @param event 事件名称。
		 * @param page 新的页码。
		 */
		(event: 'update:current-page', page: number): void
		/**
		 * 派发每页数量更新。
		 * @param event 事件名称。
		 * @param size 新的每页数量。
		 */
		(event: 'update:page-size', size: number): void
	}>()
</script>

<style scoped lang="scss"></style>
