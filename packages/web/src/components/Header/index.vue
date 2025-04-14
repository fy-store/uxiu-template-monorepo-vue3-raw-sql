<template>
	<div class="header-container flex-space-between flex-align-center pl-20 pr-20" :style>
		<div class="flex-align-center f-20">
			<el-icon
				class="mr-7 cursor-pointer"
				@click="appCommunicate.changeSidebarIsCollapse(!appCommunicate.state.isSidebarIsCollapse)"
			>
				<i-ep-fold v-show="!appCommunicate.state.isSidebarIsCollapse"></i-ep-fold>
				<i-ep-expand v-show="appCommunicate.state.isSidebarIsCollapse"></i-ep-expand>
			</el-icon>
			<h1 class="cursor-pointer" @click="router.push('/')">
				{{ project.name }}
			</h1>
		</div>
		<el-dropdown trigger="click" @command="commandCallback">
			<span class="flex-align-center dropdown-title">
				<span class="mr-3">{{ userInfo.info.name }}</span>
				<el-icon>
					<i-ep-caret-bottom></i-ep-caret-bottom>
				</el-icon>
			</span>
			<template #dropdown>
				<el-dropdown-menu>
					<el-dropdown-item command="logout">
						<el-icon><i-ep-position></i-ep-position></el-icon>
						<span>退出登录</span>
					</el-dropdown-item>
				</el-dropdown-menu>
			</template>
		</el-dropdown>
	</div>
</template>

<script lang="ts" setup>
	import { layout, project } from '@/conf'
	import { useUserInfo, useAppCommunicate } from '@/stores'
	import { computed } from 'vue'
	import { useRouter } from 'vue-router'

	const { header } = layout
	const userInfo = useUserInfo()
	const appCommunicate = useAppCommunicate()
	const router = useRouter()

	// header 样式
	const style = computed(() => {
		return {
			height: header.height,
			backgroundColor: header.backgroundColor,
			color: header.color
		}
	})

	// 右侧菜单
	const commandCallback = (command: string) => {
		const map = {
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

		localStorage.removeItem('token')
		localStorage.removeItem('userInfo')
		router.push('/login')
	}
</script>

<style scoped lang="scss">
	.header-container {
		border-bottom: 1px solid var(--el-border-color);
		box-sizing: border-box;
		box-shadow: var(--el-box-shadow-light);
		overflow: hidden;
	}

	.dropdown-title {
		outline: none;
		cursor: pointer;
	}
</style>
