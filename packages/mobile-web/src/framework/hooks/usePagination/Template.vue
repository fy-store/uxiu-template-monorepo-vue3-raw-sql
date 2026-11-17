<template>
	<var-pagination
		:current="config.pagingConfig.page"
		:size="config.pagingConfig.size"
		:total="config.pagingConfig.count"
		v-bind="({ class: config.customClass, ...(config.paginationProps ?? {}), ...$attrs } as any)"
		v-on="config.paginationEvents ?? {}"
		@update:current="emit('update:current-page', $event)"
		@update:size="emit('update:page-size', $event)"
	/>
</template>

<script lang="ts" setup>
	import type { Config } from './types'

	const { config } = defineProps<{ config: Config }>()
	const emit = defineEmits<{
		/**
		 * 派发当前页更新。
		 * @param page 新的页码。
		 */
		(event: 'update:current-page', page: number): void
		/**
		 * 派发每页数量更新。
		 * @param size 新的每页数量。
		 */
		(event: 'update:page-size', size: number): void
	}>()
</script>

<style scoped lang="scss"></style>
