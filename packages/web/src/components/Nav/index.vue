<template>
	<div class="pr-6 border-box h-30 nav-container flex-align-center">
		<el-icon class="back h-100-p flex-align-center pl-10 pr-10" :class="{ 'is-back': getBack }" @click="back">
			<i-ep-d-arrow-left></i-ep-d-arrow-left>
		</el-icon>
		<div class="history-list flex-1 h-100-p">
			<div class="tag-container flex" v-rDrag>
				<el-tag
					v-for="(it, i) in routeHistory.history"
					:key="it.path"
					class="mr-6 cursor-pointer tag"
					:type="it.active ? 'primary' : 'info'"
					@mousedown="handleMousedown"
					@click="to(it as HistoryItem)"
					closable
					@close="remove(i)"
					>{{ it.title }}</el-tag
				>
			</div>
		</div>
		<el-dropdown trigger="click" @command="commandCallback" class="ml-6">
			<el-tag class="cursor-pointer" type="info">
				<el-icon> <i-ep-more></i-ep-more> </el-icon>
			</el-tag>
			<template #dropdown>
				<el-dropdown-menu>
					<el-dropdown-item command="closeOther">
						<el-icon><i-ep-remove></i-ep-remove></el-icon>
						<span>关闭其他</span>
					</el-dropdown-item>
					<el-dropdown-item command="clear">
						<el-icon><i-ep-refresh></i-ep-refresh></el-icon>
						<span>关闭所有</span>
					</el-dropdown-item>
				</el-dropdown-menu>
			</template>
		</el-dropdown>
	</div>
</template>

<script lang="ts" setup>
	import { computed, ref } from 'vue'
	import { useRouter, useRoute } from 'vue-router'
	import { useRouteHistory } from '@/stores'
	import type { HistoryItem } from '@/stores/types'

	const router = useRouter()
	const route = useRoute()
	const routeHistory = useRouteHistory()

	let startTimer = ref(0)
	const handleMousedown = () => {
		startTimer.value = Date.now()
	}

	const to = (it: HistoryItem) => {
		const diffX = Date.now() - startTimer.value
		if (diffX > 200) {
			return
		}
		router.push(it.path)
	}

	const remove = (i: number) => {
		const diffX = Date.now() - startTimer.value
		if (diffX > 200) {
			return
		}
		routeHistory.removeByIndex(i)
	}

	const back = () => {
		const item = getBack.value
		if (item) {
			router.push(item.path)
		}
	}

	// 获取上一个历史记录
	const getBack = computed(() => {
		if (routeHistory.history.length === 1) return
		const i = routeHistory.history.findIndex((it) => it.path === route.path)
		const previousItem = routeHistory.history[i - 1]
		if (!previousItem) return
		return previousItem
	})

	// 右侧菜单
	const commandCallback = (command: string) => {
		const map = {
			closeOther() {
				routeHistory.closeOther()
			},
			clear() {
				routeHistory.clear()
			}
		}
		map[command as keyof typeof map]()
	}
</script>

<style scoped lang="scss">
	.nav-container {
		flex-shrink: 0;
		box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
		background-color: #fff;
		overflow: hidden;
	}

	.back {
		transition: 0.2s;
		cursor: pointer;
		color: #c0c4cc;

		&.is-back {
			color: #303133;
		}

		&:hover {
			transform: scale(1.2);
		}

		.icon {
			color: #ccc;
		}
	}

	.history-list {
		display: flex;
		align-items: center;
		overflow: hidden;
	}

	.tag-container {
		user-select: none;

		.tag:last-child {
			margin-right: 0;
		}
	}
</style>
