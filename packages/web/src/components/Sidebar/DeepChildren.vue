<template>
	<el-sub-menu :index="id" v-if="it.children" class="item">
		<template #title>
			<el-icon v-if="it.icon">
				<component :is="it.icon" v-bind="getIconProp(it)" :style="getIconStyle(it)" v-if="it.icon"></component>
			</el-icon>
			<span :style="getTitleStyle(it)">{{ it.title }}</span>
		</template>
		<template v-if="it.children">
			<DeepChildren v-for="(item, i) in it.children" :key="i" :it="item"></DeepChildren>
		</template>
	</el-sub-menu>
	<el-menu-item v-else :index="it.path" class="item">
		<el-icon v-if="it.icon">
			<component :is="it.icon" v-bind="getIconProp(it)" :style="getIconStyle(it)" v-if="it.icon"></component>
		</el-icon>
		<template #title>
			<span :style="getTitleStyle(it)">{{ it.title }}</span>
		</template>
	</el-menu-item>
</template>

<script lang="ts" setup>
	import { project } from '@/conf'
	import type { SidebarListItem, IconConf } from '@/conf/types'
	import type { DeepReadonly } from 'vue'
	import { useId } from 'vue'

	const id = useId()
	const { sidebar } = project
	const { it } = defineProps<{ it: DeepReadonly<SidebarListItem> }>()

	const isIconConf = (data: any): data is IconConf => {
		if (!data) return false
		if ((it.icon as any)?.component) {
			return true
		}
		return false
	}

	const getIconProp = (it: DeepReadonly<SidebarListItem>) => {
		if (isIconConf(it.icon)) {
			return it.icon.prop ?? sidebar.defaultIconProp
		}
		return sidebar.defaultIconProp
	}

	const getIconStyle = (it: DeepReadonly<SidebarListItem>) => {
		if (isIconConf(it.icon)) {
			return it.icon.style ?? sidebar.defaultIconStyle ?? ''
		}
		return sidebar.defaultIconStyle ?? ''
	}

	const getTitleStyle = (it: DeepReadonly<SidebarListItem>) => {
		return it.titleStyle ?? sidebar.defaultTitleStyle ?? ''
	}
</script>

<style scoped lang="scss"></style>
