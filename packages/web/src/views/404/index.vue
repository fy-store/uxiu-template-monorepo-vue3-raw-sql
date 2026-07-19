<template>
	<div class="not-found-page">
		<div class="not-found-card">
			<div class="code">404</div>
			<div class="desc">您访问的页面不存在</div>

			<div class="actions">
				<el-button plain @click="goBack">返回上一页</el-button>
				<el-button type="primary" @click="goHome">返回首页</el-button>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
	import { useRouter } from 'vue-router'

	const router = useRouter()

	function goBack() {
		window.history.length > 1 ? router.back() : goHome()
	}

	function goHome() {
		router.push('/')
	}
</script>

<style scoped lang="scss">
	.not-found-page {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		padding: 24px;
		box-sizing: border-box;
		background: linear-gradient(180deg, #f8fbff 0%, #f3f6fb 100%);
	}

	.not-found-card {
		width: 100%;
		max-width: 420px;
		padding: 40px 24px;
		text-align: center;
		box-sizing: border-box;
	}

	.code {
		margin-bottom: 16px;
		color: var(--theme-color-primary);
		font-size: 200px;
		font-weight: 700;
		line-height: 1;
	}

	.desc {
		color: var(--theme-color-textSecondary);
		font-size: 22px;
		line-height: 1.8;
	}

	.actions {
		display: flex;
		justify-content: center;
		gap: 12px;
		margin-top: 28px;
	}

	@media (max-width: 640px) {
		.not-found-card {
			padding: 32px 20px;
		}

		.code {
			font-size: 60px;
		}

		.desc {
			font-size: 16px;
		}

		.actions {
			flex-direction: column;
		}

		.actions :deep(.el-button) {
			width: 100%;
			margin-left: 0;
		}
	}
</style>
