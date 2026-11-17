<template>
	<div class="center h-full w-full preview-bg-light">
		<var-image :src="src" fit="contain" class="image h-full w-full" ripple @click="preview" />
	</div>
</template>

<script setup lang="ts">
	import { ImagePreview } from '@varlet/ui'
	import '@varlet/ui/es/image-preview/style/index.mjs'

	const props = defineProps<{ src: string }>()

	/** 点击图片打开可缩放的沉浸式预览。 */
	function preview() {
		ImagePreview({ images: [props.src], closeable: true })
	}
</script>

<style scoped>
	.center {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.preview-bg-light {
		background-color: var(--theme-color-background);
	}
</style>
