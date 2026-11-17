<template>
	<Popup
		variant="dialog"
		v-model:show="visible"
		url-key="passwordDialog"
		title="输入解密密码"
		confirm-button-text="确定"
		cancel-button-text="取消"
		:confirm-button-disabled="!password"
		:close-on-click-overlay="false"
		@opened="focusPasswordInput"
		@confirm="handleConfirm"
	>
		<var-input
			ref="passwordInputRef"
			v-model="password"
			type="password"
			placeholder="请输入该文件的解密密码"
			@keyup.enter="handleConfirm"
		/>
	</Popup>
</template>
<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import Popup from '@/frame/components/Popup/index.vue'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{
	'update:visible': [value: boolean],
	'confirm': [password: string]
}>()

/** 获取或更新密码弹窗的显示状态。 */
const visible = computed({
	get: () => props.visible,
	set: (v) => emit('update:visible', v)
})

const password = ref('')
const passwordInputRef = ref<{ focus: () => void } | null>(null)

/**
 * 在密码弹窗打开后聚焦输入框。
 */
function focusPasswordInput() {
	nextTick(() => {
		passwordInputRef.value?.focus()
	})
}

watch(visible, (val) => {
	if (val) {
		password.value = ''
	}
})

/**
 * 校验密码并派发确认事件。
 */
function handleConfirm() {
	if (!password.value) return
	emit('confirm', password.value)
}
</script>
