<template>
	<div class="center h-full w-full preview-bg-light">
		<el-image
			:src="src"
			:preview-src-list="[src]"
			fit="contain"
			class="image h-full w-full"
		/>
	</div>
</template>

<script setup lang="ts">
	defineProps<{ src: string }>()
</script>

<style scoped>
	.center {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.preview-bg-light {
		background-color: #f5f7fa;
	}
</style>
