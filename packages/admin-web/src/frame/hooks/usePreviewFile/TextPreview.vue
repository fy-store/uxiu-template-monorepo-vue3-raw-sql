<template>
	<div class="h-full w-full overflow-auto preview-bg-light">
		<pre class="text-content" v-if="content !== null">{{ content }}</pre>
		<div v-else class="center h-full w-full preview-text-empty">
			<i-ep-document class="icon-empty mb-10px" />
			<div>无法加载文件内容</div>
		</div>
	</div>
</template>

<script setup lang="ts">
	import { ref, onMounted, watch } from 'vue'

	const props = defineProps<{ src: string }>()

	const content = ref<string | null>(null)

	onMounted(() => loadContent())

	watch(() => props.src, () => loadContent())

	/**
	 * 获取文本资源并更新预览内容。
	 */
	async function loadContent() {
		if (!props.src) {
			content.value = null
			return
		}
		try {
			const response = await fetch(props.src)
			if (!response.ok) {
				content.value = `加载失败: ${response.status} ${response.statusText}`
				return
			}
			content.value = await response.text()
		} catch (err) {
			content.value = `加载失败: ${err instanceof Error ? err.message : String(err)}`
		}
	}
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

	.preview-text-empty {
		color: #909399;
	}

	.icon-empty {
		font-size: 48px;
	}

	.text-content {
		padding: 16px;
		margin: 0;
		font-size: 13px;
		line-height: 1.6;
		white-space: pre-wrap;
		word-break: break-all;
		font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
		color: #333;
	}
</style>
