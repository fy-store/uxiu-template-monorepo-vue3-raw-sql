<template>
	<div class="h-full w-full overflow-auto preview-bg-light">
		<pre class="text-content" v-if="content !== null">{{ content }}</pre>
		<div v-else class="empty-state">
			<var-icon name="file-document-outline" class="empty-state__icon" />
			<div class="empty-state__text">无法加载文件内容</div>
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
	.preview-bg-light {
		background-color: var(--theme-color-background);
	}

	.empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		gap: 10px;
		width: 100%;
		height: 100%;
		color: var(--color-on-surface-variant);
	}

	.empty-state__icon {
		font-size: 44px;
		color: color-mix(in srgb, var(--color-on-surface-variant) 45%, transparent);
	}

	.empty-state__text {
		padding: 0 24px;
		font-size: 13px;
		line-height: 20px;
		text-align: center;
	}

	.text-content {
		padding: 16px;
		margin: 0;
		font-size: 13px;
		line-height: 1.6;
		white-space: pre-wrap;
		word-break: break-all;
		font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
		color: var(--theme-color-text);
	}
</style>
