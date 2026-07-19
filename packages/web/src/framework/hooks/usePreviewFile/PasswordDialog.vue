<template>
	<el-dialog
		v-model="visible"
		title="输入解密密码"
		width="400px"
		append-to-body
		:close-on-click-modal="false"
		@opened="focusPasswordInput"
	>
		<el-input
			ref="passwordInputRef"
			v-model="password" 
			type="password" 
			placeholder="请输入该文件的解密密码" 
			show-password 
			@keyup.enter="handleConfirm"
		></el-input>
		<template #footer>
			<div class="dialog-footer">
				<el-button @click="visible = false">取消</el-button>
				<el-button type="primary" :disabled="!password" @click="handleConfirm">确定</el-button>
			</div>
		</template>
	</el-dialog>
</template>
<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

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
