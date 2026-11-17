<template>
	<Popup v-model:show="visible" url-key="viewAuthority" position="bottom" :default-style="false" @open="initFormData">
		<div class="form-popup">
			<div class="form-popup__header">
				<span>预览管理员权限</span>
				<var-button text round @click="visible = false">
					<var-icon name="window-close" />
				</var-button>
			</div>
			<div class="form-popup__body">
				<AuthoritySelect
					class="authority-select--fill"
					:model-value="data.authority"
					:options="authorityOptions"
					readonly
				/>
			</div>
		</div>
	</Popup>
</template>

<script lang="ts" setup>
	import type { Admin } from '@server/api/v1/admin'
	import type { Authority } from '@server/api/v1/authority'
	import { ref } from 'vue'
	import Popup from '@/frame/components/Popup/index.vue'
	import { account } from '@/api'
	import { message } from '@/frame/utils/index.ts'
	import AuthoritySelect from './AuthoritySelect.vue'

	const visible = defineModel<boolean>({ default: false })
	const { data } = defineProps<{ data: Admin }>()

	const authorityOptions = ref<Authority[]>([])
	/** 打开弹层时加载权限选项 */
	async function initFormData() {
		const { code, msg, data: options = [] } = await account.authoritySelect()
		if (code !== 0) {
			message.error(msg)
		}
		authorityOptions.value = options
	}
</script>

<style scoped lang="scss">
	/* 权限列表占满剩余高度, 滚动交给列表内部 */
	.form-popup__body {
		overflow: hidden;
	}
</style>
