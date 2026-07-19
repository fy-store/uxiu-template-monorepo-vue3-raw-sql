<template>
	<div class="download-actions">
		<div class="flex items-center gap-6px">
			<el-button type="primary" text :disabled="originalDisabled || downloadActive" @click="emit('original')">
				<i-ep-download class="text-12px" />原始下载
			</el-button>
			<el-button v-if="encrypted" type="primary" text :disabled="downloadActive" @click="emit('decrypt')">
				<i-ep-download class="text-12px" />解密下载
			</el-button>
			<el-button
				v-if="encrypted && !decrypted"
				type="primary"
				text
				:disabled="loading"
				@click="emit('preview')"
			>
				<i-ep-view class="text-12px" />解密预览
			</el-button>
			<el-select
				:model-value="mode"
				class="download-mode-select"
				:disabled="downloadActive"
				@update:model-value="emit('update:mode', $event)"
			>
				<el-option label="普通下载" value="browser" />
				<el-option label="下载到文件夹" value="directory" />
			</el-select>
		</div>

		<div v-if="downloadStatus !== 'idle'" class="download-progress">
			<el-progress :percentage="progress" :stroke-width="8" />
			<el-button type="primary" text @click="emit('toggle-pause')">
				{{ downloadStatus === 'paused' ? '继续' : '暂停' }}
			</el-button>
			<el-button type="danger" text @click="emit('cancel')">取消</el-button>
		</div>
	</div>
</template>

<script setup lang="ts">
	import type { DownloadMode } from './types'
	import type { DownloadTaskStatus } from './downloadTaskTypes'
	import { computed } from 'vue'

	const props = defineProps<{
		mode: DownloadMode
		encrypted: boolean
		decrypted: boolean
		originalDisabled: boolean
		loading: boolean
		downloadStatus: DownloadTaskStatus
		progress: number
	}>()

	const emit = defineEmits<{
		'update:mode': [mode: DownloadMode]
		original: []
		decrypt: []
		preview: []
		'toggle-pause': []
		cancel: []
	}>()

	/** 判断当前是否已有下载任务。 */
	const downloadActive = computed(() => props.downloadStatus !== 'idle')
</script>

<style scoped>
	.download-actions {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.download-mode-select {
		width: 140px;
	}

	.download-progress {
		display: grid;
		grid-template-columns: minmax(160px, 1fr) auto auto;
		align-items: center;
		gap: 4px;
	}
</style>
