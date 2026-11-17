<template>
	<var-dialog v-if="props.variant === 'dialog'" v-model:show="show" v-bind="$attrs">
		<slot />
	</var-dialog>
	<var-popup v-else v-model:show="show" v-bind="$attrs">
		<slot />
	</var-popup>
</template>

<script lang="ts" setup>
	/**
	 * 弹窗组件, 在 Varlet 弹层基础上统一接入地址同步能力。
	 * - 默认将显隐状态同步至地址栏参数, 系统返回键可关闭弹窗
	 * - 可通过 urlSync 关闭地址同步, 通过 urlKey 指定参数名
	 * - 可通过 variant 切换底层组件: popup 为 var-popup 弹层, dialog 为 var-dialog 对话框
	 * - 其余属性与事件均透传给底层组件
	 */
	import { watch } from 'vue'
	import { useChangeLocation } from '@/frame/hooks'

	defineOptions({ inheritAttrs: false })

	const props = withDefaults(
		defineProps<{
			/** 是否将显隐同步至地址栏参数, 默认开启; 关闭后系统返回键不再联动关闭弹窗 */
			urlSync?: boolean
			/** 地址栏参数名, 同一页面同时打开的多个弹窗需要保持唯一 */
			urlKey?: string
			/** 底层弹层形态, popup 对应 var-popup, dialog 对应 var-dialog */
			variant?: 'popup' | 'dialog'
		}>(),
		{
			urlSync: true,
			urlKey: 'popup',
			variant: 'popup'
		}
	)

	const show = defineModel<boolean>('show', { default: false })

	const { visible, open, close } = useChangeLocation(() => props.urlKey, {
		enabled: () => props.urlSync
	})

	// 地址栏状态变化(系统返回、浏览器前进后退、刷新)时同步弹窗显隐
	watch(
		visible,
		(value) => {
			if (!props.urlSync) return
			if (show.value !== value) show.value = value
		},
		{ immediate: true }
	)

	// 弹窗显隐变化时同步地址栏参数
	watch(show, (value) => {
		if (!props.urlSync) return
		if (value) {
			open()
		} else {
			close()
		}
	})
</script>
