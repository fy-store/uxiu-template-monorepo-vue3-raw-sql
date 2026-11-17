<template>
	<div class="header-container flex flex-wrap items-center justify-end px-20px" :style>
		<el-dropdown trigger="click" @command="commandCallback">
			<span class="dropdown-title flex flex-wrap items-center">
				<span class="mr-3px">{{ userInfo.info?.name }}</span>
				<el-icon>
					<i-ep-caret-bottom></i-ep-caret-bottom>
				</el-icon>
			</span>
			<template #dropdown>
				<el-dropdown-menu>
					<el-dropdown-item command="settings">
						<el-icon><i-ep-setting></i-ep-setting></el-icon>
						<span>个性化设置</span>
					</el-dropdown-item>
					<el-dropdown-item command="logout" divided>
						<el-icon><i-ep-position></i-ep-position></el-icon>
						<span>退出登录</span>
					</el-dropdown-item>
				</el-dropdown-menu>
			</template>
		</el-dropdown>
	</div>
</template>

<script lang="ts" setup>
	import { layout, persistenceKeys } from '@/config'
	import { useUserInfo } from '@/stores'
	import { account } from '@/api'
	import { computed } from 'vue'
	import { useRouter } from 'vue-router'

	const { header } = layout
	const userInfo = useUserInfo()
	const router = useRouter()

	// header 样式
	const style = computed(() => {
		return {
			height: header.height,
			backgroundColor: header.backgroundColor,
			color: header.color
		}
	})

	/** 打开个性化设置页面 */
	const settings = () => {
		router.push('/settings')
	}

	// 右侧菜单
	const commandCallback = (command: string) => {
		const map = {
			settings,
			logout
		}
		map[command as keyof typeof map]()
	}

	const logout = async () => {
		try {
			await ElMessageBox.confirm('确认退出账号 ?', '注意', {
				confirmButtonText: '确 认',
				cancelButtonText: '取 消',
				type: 'warning'
			})
		} catch (error) {
			return
		}

		// 通知后端注销当前 token
		await account.logout()
		localStorage.removeItem(persistenceKeys.TOKEN)
		localStorage.removeItem(persistenceKeys.USER_INFO)
		router.push('/login')
		await Promise.all([userInfo.refreshInfo(), userInfo.refreshCommonConfig()])
	}
</script>

<style scoped lang="scss">
	.header-container {
		border-bottom: 1px solid var(--theme-color-border);
		box-sizing: border-box;
		box-shadow: var(--theme-shadow-base);
		overflow: hidden;
	}

	.dropdown-title {
		outline: none;
		cursor: pointer;
	}
</style>
