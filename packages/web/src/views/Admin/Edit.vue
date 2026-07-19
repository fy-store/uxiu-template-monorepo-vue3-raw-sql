<template>
	<el-drawer
		v-model="visible"
		@open="initFormData"
		@close="resetFormData"
		title="编辑管理员"
		size="800px"
		destroy-on-close
		:close-on-click-modal="false"
	>
		<el-form :model="formData" label-width="110px" :rules="rules" ref="Form" @submit.prevent="submit">
			<el-form-item label="管理员名称" prop="name">
				<el-input v-model="formData.name" placeholder="请输入管理员名称" />
			</el-form-item>
			<el-form-item label="管理员密码" prop="password">
				<el-input v-model="formData.password" placeholder="请输入管理员密码" type="password" show-password clearable />
			</el-form-item>
			<el-form-item label="是否为超管" v-if="userInfo.info.isSuper">
				<el-select v-model="formData.isSuper" placeholder="Select" class="w-full">
					<el-option v-for="(item, i) in isSuperOptions" :key="i" :label="item.name" :value="item.id" />
				</el-select>
			</el-form-item>
			<el-form-item v-if="!formData.isSuper" label="管理员权限" prop="authority">
				<el-tree
					class="w-full"
					:default-checked-keys="formData.authority"
					:data="authorityOptions"
					node-key="id"
					:props="treeProps"
					show-checkbox
					@check="authorityCheck"
				/>
			</el-form-item>
			<el-form-item v-else label="管理员权限">
				<span class="text-#909399">超级管理员默认拥有全部权限，无需勾选</span>
			</el-form-item>
			<el-form-item label="备注" v-if="userInfo.info.isSuper">
				<el-input type="textarea" v-model="formData.remark" placeholder="请输入备注"></el-input>
			</el-form-item>
		</el-form>
		<div class="flex justify-center flex-wrap">
			<el-button @click="visible = false">取 消</el-button>
			<el-button type="primary" @click="submit">提交表单</el-button>
		</div>
	</el-drawer>
</template>

<script lang="ts" setup>
	import type { Admin, Authority, UpdateAdminParams } from '@server/index'
	import type { CheckedInfo, FormInstance, FormRules } from 'element-plus'
	import { reactive, ref, useTemplateRef } from 'vue'
	import { admin, account } from '@/api'
	import { useUserInfo } from '@/stores'

	const emit = defineEmits(['success'])
	const visible = defineModel({ default: false })
	const { data } = defineProps<{ data: Admin }>()
	const treeProps = {
		label: 'name'
	}

	const FormRef = useTemplateRef<FormInstance>('Form')
	const rules = reactive<FormRules<UpdateAdminParams>>({
		name: [{ required: true, message: '请输入管理员名称', trigger: 'blur' }],
		password: [{ required: false, message: '管理员密码长度必须 >= 5 并且 <= 20', min: 5, max: 20, trigger: 'blur' }]
	})

	const userInfo = useUserInfo()
	const authorityOptions = ref<Authority[]>([])
	async function getAuthorityOptions() {
		const { code, msg, data = [] } = await account.getAuthoritySelect()
		if (code !== 0) {
			ElMessage({ message: msg, type: 'error' })
		}
		authorityOptions.value = data
	}

	/** 选择权限 */
	function authorityCheck(_: unknown, { checkedKeys }: CheckedInfo) {
		formData.value.authority = checkedKeys.map(String)
	}

	const isSuperOptions = ref([
		{ id: true, name: '是' },
		{ id: false, name: '否' }
	])

	const formData = ref<UpdateAdminParams>({
		id: -1,
		name: '',
		password: '',
		authority: [],
		isSuper: false,
		remark: ''
	})

	async function initFormData() {
		const loading = ElLoading.service({ text: '加载中' })
		formData.value = {
			id: data.id,
			name: data.name,
			password: '',
			authority: [...data.authority],
			isSuper: data.isSuper,
			remark: data.remark
		}
		await getAuthorityOptions()
		loading.close()
	}

	function resetFormData() {
		FormRef.value!.resetFields()
	}

	async function submit() {
		try {
			await FormRef.value!.validate()
		} catch (error) {
			if (error instanceof Error) throw error
			ElMessage({
				message: '请保证所有必填项都填写',
				type: 'warning'
			})
			return
		}

		const loading = ElLoading.service({ text: '更新中' })
		const body: UpdateAdminParams = { ...formData.value }
		if (body.password?.trim() === '') {
			delete body.password
		}
		const { code, msg } = await admin.updateAdmin(body)
		loading.close()
		if (code !== 0) {
			ElMessage({
				message: msg,
				type: 'error'
			})
			return
		}

		visible.value = false
		emit('success')
		ElMessage({
			message: msg,
			type: 'success'
		})
	}
</script>

<style scoped lang="scss"></style>
