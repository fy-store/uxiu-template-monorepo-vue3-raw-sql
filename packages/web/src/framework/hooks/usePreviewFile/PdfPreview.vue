<template>
	<div class="center h-full w-full preview-bg-light">
		<PDFViewer :config="{ src }" class="h-full w-full" />
	</div>
</template>

<script setup lang="ts">
	import { PDFViewer } from '@embedpdf/vue-pdf-viewer'

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
