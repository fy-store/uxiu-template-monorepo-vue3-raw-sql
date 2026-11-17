<template>
	<div class="empty-state">
		<var-icon name="file-document-outline" class="empty-state__icon" />
		<div class="empty-state__text">暂不支持预览该类型文件，请使用顶部下载操作</div>
	</div>
</template>

<style scoped>
	.empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		gap: 10px;
		width: 100%;
		height: 100%;
		background-color: var(--theme-color-background);
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
</style>
