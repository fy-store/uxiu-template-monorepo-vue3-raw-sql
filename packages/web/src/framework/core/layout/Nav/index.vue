<template>
	<div class="nav-container h-30px box-border flex flex-wrap items-center pr-6px">
		<el-icon
			class="back h-full flex flex-wrap items-center px-10px"
			:class="{ 'is-back': getBack }"
			@click="back"
			title="上一个页面"
		>
			<i-ep-arrow-left></i-ep-arrow-left>
		</el-icon>
		<div class="history-list h-full flex-1">
			<div class="tag-container flex" v-r-drag>
				<el-tag
					v-for="(it, i) in routeHistory.history"
					:key="it.path"
					class="tag mr-6px cursor-pointer"
					:type="it.active ? 'primary' : 'info'"
					@mousedown="handleTagMousedown(i, $event)"
					@mouseup="handleTagMouseup(i, $event)"
					@click="to(it as HistoryItem)"
					closable
					@close="remove(i)"
					>{{ it.title }}</el-tag
				>
			</div>
		</div>
		<el-icon
			class="next h-full flex flex-wrap items-center px-10px"
			:class="{ 'is-next': getNext }"
			@click="next"
			title="下一个页面"
		>
			<i-ep-arrow-right></i-ep-arrow-right>
		</el-icon>
		<el-dropdown trigger="click" @command="commandCallback" class="ml-6px">
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
	import { computed, ref, onMounted, onUnmounted } from 'vue'
	import { useRouter, useRoute } from 'vue-router'
	import { useRouteHistory } from '@/stores'
	import type { HistoryItem } from '@/stores/types'

	const router = useRouter()
	const route = useRoute()
	const routeHistory = useRouteHistory()

	const startTimer = ref(0)
	const downIndex = ref<number | null>(null)
	const downIsMiddle = ref(false)

	function handleTagMousedown(i: number, e: MouseEvent) {
		startTimer.value = Date.now()
		// 记录按下的标签索引与是否为中键
		downIndex.value = i
		downIsMiddle.value = e.button === 1
		if (downIsMiddle.value) {
			// 阻止默认中键行为（如在部分浏览器的自动滚动）
			e.preventDefault()
			e.stopPropagation()
		}
	}

	function handleTagMouseup(i: number, e: MouseEvent) {
		// 仅当按下与松开都是同一个标签且为中键时关闭
		if (downIsMiddle.value && downIndex.value === i && e.button === 1) {
			// 阻止默认中键行为
			e.preventDefault()
			e.stopPropagation()
			// 中键关闭不受长按阈值限制，直接移除
			routeHistory.removeByIndex(i)
		}
		// 重置状态
		downIndex.value = null
		downIsMiddle.value = false
	}

	// 全局中键松开时也要重置状态，避免在标签外松开未重置
	function handleGlobalMouseup(e: MouseEvent) {
		if (downIsMiddle.value && e.button === 1) {
			downIndex.value = null
			downIsMiddle.value = false
		}
	}

	onMounted(() => {
		// 使用冒泡阶段，确保标签上的 mouseup 先执行，再全局重置
		window.addEventListener('mouseup', handleGlobalMouseup, false)
	})

	onUnmounted(() => {
		window.removeEventListener('mouseup', handleGlobalMouseup, false)
	})

	function to(it: HistoryItem) {
		const diffX = Date.now() - startTimer.value
		if (diffX > 200) {
			return
		}
		router.push(it.path)
	}

	function remove(i: number) {
		const diffX = Date.now() - startTimer.value
		if (diffX > 200) {
			return
		}
		routeHistory.removeByIndex(i)
	}

	function back() {
		const item = getBack.value
		if (item) {
			router.push(item.path)
		}
	}

	function next() {
		const item = getNext.value
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

	// 获取下一个历史记录
	const getNext = computed(() => {
		if (routeHistory.history.length === 1) return
		const i = routeHistory.history.findIndex((it) => it.path === route.path)
		const nextItem = routeHistory.history[i + 1]
		if (!nextItem) return
		return nextItem
	})

	// 右侧菜单
	function commandCallback(command: string) {
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

	.back,
	.next {
		transition: 0.2s;
		cursor: pointer;
		color: #c0c4cc;

		&.is-back,
		&.is-next {
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
