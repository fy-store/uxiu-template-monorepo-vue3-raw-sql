<template>
	<div class="center h-full w-full flex flex-col preview-bg-light preview-text-empty">
		<i-ep-document class="icon-empty mb-10px" />
		<div>暂不支持预览该类型文件，请使用顶部下载操作</div>
	</div>
</template>

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
</style>
