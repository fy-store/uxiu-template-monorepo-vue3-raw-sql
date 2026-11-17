<template>
	<div class="download-actions">
		<div class="action-row">
			<var-button
				class="action-chip"
				type="primary"
				text
				:disabled="originalDisabled || downloadActive"
				@click="emit('original')"
			>
				<var-icon name="download" :size="16" class="mr-4px" />原始下载
			</var-button>
			<var-button
				v-if="encrypted"
				class="action-chip"
				type="primary"
				text
				:disabled="downloadActive"
				@click="emit('decrypt')"
			>
				<var-icon name="download" :size="16" class="mr-4px" />解密下载
			</var-button>
			<var-button
				v-if="encrypted && !decrypted"
				class="action-chip"
				type="primary"
				text
				:disabled="loading"
				@click="emit('preview')"
			>
				<var-icon name="view" :size="16" class="mr-4px" />解密预览
			</var-button>
			<var-select
				:model-value="mode"
				class="download-mode-select"
				:hint="false"
				:disabled="downloadActive"
				:options="downloadModeOptions"
				@update:model-value="emit('update:mode', $event)"
			/>
		</div>

		<div v-if="downloadStatus !== 'idle'" class="download-progress">
			<var-progress :value="progress" :line-width="6" />
			<span class="download-progress__text">{{ Math.round(progress) }}%</span>
			<var-button class="download-progress__action" type="primary" text @click="emit('toggle-pause')">
				{{ downloadStatus === 'paused' ? '继续' : '暂停' }}
			</var-button>
			<var-button class="download-progress__action" type="danger" text @click="emit('cancel')">取消</var-button>
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

	/** 下载方式选项 */
	const downloadModeOptions = [
		{ label: '普通下载', value: 'browser' },
		{ label: '下载到文件夹', value: 'directory' }
	]

	/** 判断当前是否已有下载任务。 */
	const downloadActive = computed(() => props.downloadStatus !== 'idle')
</script>

<style scoped>
	.download-actions {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.action-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
	}

	/* 操作胶囊按钮与下载方式选择器统一尺寸 */
	.action-chip {
		height: 34px;
		padding: 0 14px;
		border: 1px solid var(--color-outline);
		border-radius: 17px;
		font-size: 13px;
	}

	.download-mode-select {
		display: flex;
		align-items: center;
		flex: 1 1 148px;
		min-width: 132px;
		height: 34px;
		border: 1px solid var(--color-outline);
		border-radius: 17px;
		box-sizing: border-box;
		font-size: 13px;
		--select-label-font-size: 13px;
		/* 压缩字段内部间距并隐藏默认下划线, 使内容与胶囊尺寸一致 */
		--field-decorator-standard-normal-margin-top: 0px;
		--field-decorator-standard-normal-margin-bottom: 0px;
		--field-decorator-standard-normal-icon-margin-top: 0px;
		--field-decorator-standard-normal-icon-margin-bottom: 0px;
		--field-decorator-standard-normal-non-hint-margin-top: 0px;
		--field-decorator-standard-small-non-hint-margin-top: 0px;
		--field-decorator-line-size: 0px;
		--field-decorator-line-focus-size: 0px;
	}

	/* 下拉菜单锚定为封面元素, 让封面撑满胶囊, 使菜单与选择框同宽同位 */
	.download-mode-select :deep(.var-select__menu),
	.download-mode-select :deep(.var-field-decorator) {
		height: 100%;
	}

	/* 内部控制器撑满高度, 使值文本与箭头垂直居中 */
	.download-mode-select :deep(.var-field-decorator__controller) {
		height: 100%;
	}

	/* 值文本与箭头左右留白(原由根节点 padding 提供) */
	.download-mode-select :deep(.var-select__select) {
		padding: 0 14px;
	}

	.download-mode-select :deep(.var-field-decorator__icon:last-child) {
		margin-right: 14px;
	}

	.download-progress {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto auto auto;
		align-items: center;
		gap: 8px;
	}

	.download-progress__text {
		min-width: 34px;
		color: var(--color-on-surface-variant);
		font-size: 12px;
		font-variant-numeric: tabular-nums;
		text-align: right;
	}

	.download-progress__action {
		padding: 0 6px;
		font-size: 13px;
	}
</style>
