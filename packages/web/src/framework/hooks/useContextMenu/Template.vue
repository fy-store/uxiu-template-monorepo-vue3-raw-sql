<template>
	<teleport v-if="teleport" to="body">
		<div
			v-show="visible"
			ref="menuRef"
			data-context-menu-root="true"
			:class="['sys-context-menu', customClass]"
			:style="menuStyle"
			@contextmenu.prevent
			@click.stop
		>
			<slot name="menu" :items="visibleItems" :context="context">
				<template v-for="(item, index) in visibleItems" :key="getItemKey(item, index)">
					<div v-if="item.divided" class="sys-context-menu-divider"></div>
					<div
						:class="['sys-context-menu-item', { 'is-disabled': item.disabled }]"
						@click="onItemClick(item)"
					>
						<slot name="item" :item="item" :index="index" :context="context">
							<i v-if="item.icon" :class="item.icon" class="mr-6px text-12px" />
							<span class="sys-context-menu-label">{{ item.name }}</span>
						</slot>
					</div>
				</template>
			</slot>
		</div>
	</teleport>

	<div
		v-else
		v-show="visible"
		ref="menuRef"
		data-context-menu-root="true"
		:class="['sys-context-menu', customClass]"
		:style="menuStyle"
		@contextmenu.prevent
		@click.stop
	>
		<slot name="menu" :items="visibleItems" :context="context">
			<template v-for="(item, index) in visibleItems" :key="getItemKey(item, index)">
				<div v-if="item.divided" class="sys-context-menu-divider"></div>
				<div
					:class="['sys-context-menu-item', { 'is-disabled': item.disabled }]"
					@click="onItemClick(item)"
				>
					<slot name="item" :item="item" :index="index" :context="context">
						<i v-if="item.icon" :class="item.icon" class="mr-6px text-12px" />
							<span class="sys-context-menu-label">{{ item.name }}</span>
					</slot>
				</div>
			</template>
		</slot>
	</div>
</template>

<script setup lang="ts">
	import type { MenuItem, TemplateProps } from './types'
	import { computed, nextTick, ref, watch } from 'vue'
	import './styles.scss'

	const props = defineProps<TemplateProps>()
	const emit = defineEmits<{
		/**
		 * 派发菜单位置更新。
		 * @param event 事件名称。
		 * @param value 修正后的菜单坐标。
		 */
		(event: 'update:position', value: { x: number; y: number }): void
		/**
		 * 派发菜单项选择事件。
		 * @param event 事件名称。
		 * @param item 被选择的菜单项。
		 */
		(event: 'select', item: MenuItem): void
	}>()

	const menuRef = ref<HTMLElement>()

	/** 获取过滤隐藏项后的可见菜单项。 */
	const visibleItems = computed(() => props.items.filter((item) => !item.hidden))

	/** 获取菜单定位、层级和最小宽度样式。 */
	const menuStyle = computed(() => {
		const width = props.minWidth
		const minWidth = typeof width === 'number' ? `${width}px` : width

		return {
			left: `${props.x}px`,
			top: `${props.y}px`,
			zIndex: props.zIndex,
			minWidth
		}
	})

	/**
	 * 获取用于 Vue 列表渲染的稳定菜单项键。
	 * @param item 菜单项。
	 * @param index 菜单项索引。
	 * @returns 菜单项值、名称或索引。
	 */
	const getItemKey = (item: MenuItem, index: number) => item.value ?? item.name ?? index

	/**
	 * 处理菜单项点击并派发选择事件。
	 * @param item 被点击的菜单项。
	 */
	const onItemClick = (item: MenuItem) => {
		if (item.disabled) return
		emit('select', item)
	}

	/**
	 * 根据视口边界修正菜单位置，避免菜单超出可视区域。
	 */
	const updatePosition = () => {
		if (!props.visible || !menuRef.value || typeof window === 'undefined') return

		const rect = menuRef.value.getBoundingClientRect()
		const margin = 8
		const maxX = window.innerWidth - rect.width - margin
		const maxY = window.innerHeight - rect.height - margin

		let x = props.x
		let y = props.y

		if (x > maxX) x = Math.max(margin, maxX)
		if (y > maxY) y = Math.max(margin, maxY)

		if (x !== props.x || y !== props.y) {
			emit('update:position', { x, y })
		}
	}

	watch(
		() => [props.visible, props.items, props.x, props.y],
		() => {
			nextTick(() => updatePosition())
		},
		{ deep: true }
	)
</script>
