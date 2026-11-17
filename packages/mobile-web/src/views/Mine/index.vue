<template>
	<div class="mine-page h-full box-border flex flex-col overflow-y-auto">
		<div class="profile-card">
			<div class="avatar">{{ avatarText }}</div>
			<div class="min-w-0 flex-1">
				<div class="name-row">
					<span class="name">{{ userInfo.info?.name || '-' }}</span>
					<span v-if="userInfo.info?.isSuper" class="super-tag">超管</span>
				</div>
				<div class="account">{{ userInfo.info?.account || '-' }}</div>
			</div>
		</div>

		<div class="info-card">
			<div class="info-row">
				<span class="label">名称</span>
				<span class="value">{{ userInfo.info?.name || '-' }}</span>
			</div>
			<div class="info-row">
				<span class="label">账号</span>
				<span class="value">{{ userInfo.info?.account || '-' }}</span>
			</div>
			<div class="info-row">
				<span class="label">创建时间</span>
				<span class="value">{{ createTime }}</span>
			</div>
			<div class="info-row" v-if="userInfo.info?.remark">
				<span class="label">备注</span>
				<span class="value">{{ userInfo.info?.remark }}</span>
			</div>
		</div>

		<div class="logout-area">
			<var-button block type="danger" @click="logout">退出登录</var-button>
		</div>
	</div>
</template>

<script lang="ts" setup>
	/**
	 * 个人中心页面。
	 * - 展示当前账号的个人信息
	 * - 提供退出登录操作
	 */
	import { computed } from 'vue'
	import { useRouter } from 'vue-router'
	import dayjs from 'dayjs'
	import { persistenceKeys } from '@/config'
	import { useUserInfo } from '@/stores'
	import { confirm } from '@/framework/utils'

	const router = useRouter()
	const userInfo = useUserInfo()

	// 头像占位文本: 名称首字, 未获取到名称时使用 "我"
	const avatarText = computed(() => userInfo.info?.name?.slice(0, 1) || '我')

	// 创建时间展示文本
	const createTime = computed(() => {
		if (!userInfo.info?.createTime) {
			return '-'
		}
		return dayjs(userInfo.info.createTime).format('YYYY-MM-DD HH:mm')
	})

	/** 退出登录: 确认后清理本地登录态, 回到登录页并重置用户信息 */
	async function logout() {
		const isConfirmed = await confirm('确认退出账号 ?')
		if (!isConfirmed) {
			return
		}

		localStorage.removeItem(persistenceKeys.token)
		localStorage.removeItem(persistenceKeys.userInfo)
		router.push('/login')
		await userInfo.refreshInfo()
	}
</script>

<style scoped lang="scss">
	.mine-page {
		gap: 12px;
		padding: 12px;
		background: var(--theme-color-background);
	}

	.profile-card {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 20px 16px;
		border-radius: var(--theme-radius-lg, 12px);
		background:
			/* 右上高光提升卡片质感 */
			radial-gradient(120% 140% at 100% 0%, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0) 48%),
			linear-gradient(
				135deg,
				var(--theme-color-secondary) 0%,
				color-mix(in oklab, var(--theme-color-secondary) 70%, var(--theme-color-primary)) 100%
			);
		color: #fff;
		box-shadow: var(--theme-shadow-base);
	}

	.avatar {
		display: grid;
		flex-shrink: 0;
		place-items: center;
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.25);
		font-weight: 700;
		font-size: 24px;
	}

	.name-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.name {
		font-weight: 600;
		font-size: 18px;
	}

	.super-tag {
		flex-shrink: 0;
		padding: 2px 8px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.25);
		font-size: 12px;
	}

	.account {
		margin-top: 4px;
		font-size: 13px;
		opacity: 0.85;
		word-break: break-all;
	}

	.info-card {
		overflow: hidden;
		border-radius: var(--theme-radius-lg, 12px);
		background: var(--theme-color-surface);
		box-shadow: var(--theme-shadow-base);
	}

	.info-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 14px 16px;

		& + .info-row {
			border-top: 1px solid var(--theme-color-border);
		}
	}

	.label {
		flex-shrink: 0;
		color: var(--theme-color-textSecondary);
		font-size: 14px;
	}

	.value {
		color: var(--theme-color-text);
		font-size: 14px;
		text-align: right;
		word-break: break-all;
	}

	.logout-area {
		// margin-top: auto;
		padding: 12px 0 calc(4px + env(safe-area-inset-bottom));
	}
</style>
