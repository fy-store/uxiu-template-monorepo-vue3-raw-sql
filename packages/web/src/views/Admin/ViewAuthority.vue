<template>
	<el-drawer v-model="visible" title="预览管理员权限" size="800px" destroy-on-close :close-on-click-modal="false">
		<el-tree
			class="w-full"
			:default-checked-keys="data.authority"
			:data="authorityOptions"
			node-key="id"
			:props="treeProps"
		/>
	</el-drawer>
</template>

<script lang="ts" setup>
	import type { Admin, Authority } from '@server/index'
	import { ref } from 'vue'
	import { account } from '@/api'

	const emit = defineEmits(['success'])
	const visible = defineModel({ default: false })
	const { data } = defineProps<{ data: Admin }>()
	const treeProps = {
		label: 'name'
	}

	const authorityOptions = ref<Authority[]>([])
	async function getAuthorityOptions() {
		const { code, msg, data = [] } = await account.getAuthoritySelect()
		if (code !== 0) {
			ElMessage({ message: msg, type: 'error' })
		}
		authorityOptions.value = data
	}

	async function initFormData() {
		const loading = ElLoading.service({ text: '加载中' })
		await getAuthorityOptions()
		loading.close()
	}
	initFormData()
</script>

<style scoped lang="scss"></style>
