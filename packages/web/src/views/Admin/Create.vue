<template>
	<el-button @click="initFormData"><i-ep-plus class="mr-5px text-12px" />创建管理员</el-button>
	<el-drawer
		v-model="visible"
		@close="resetFormData"
		title="创建管理员"
		size="800px"
		destroy-on-close
		:close-on-click-modal="false"
	>
		<el-form :model="formData" label-width="110px" :rules="rules" ref="Form" @submit.prevent="submit">
			<el-form-item label="管理员名称" prop="name">
				<el-input v-model="formData.name" placeholder="请输入管理员名称" />
			</el-form-item>
			<el-form-item label="管理员账号" prop="account">
				<el-input v-model="formData.account" placeholder="请输入管理员账号" />
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
	import type { CheckedInfo, FormInstance, FormRules } from 'element-plus'
	import type { CreateAdminParams, Authority } from '@server/index'
	import { reactive, ref, useTemplateRef } from 'vue'
	import { admin, account } from '@/api'
	import { useUserInfo } from '@/stores'

	const emit = defineEmits(['success'])
	const visible = ref(false)
	const treeProps = {
		label: 'name'
	}

	const FormRef = useTemplateRef<FormInstance>('Form')
	const rules = reactive<FormRules<CreateAdminParams>>({
		name: [{ required: true, message: '请输入管理员名称', trigger: 'blur' }],
		account: [{ required: true, message: '管理员账号长度必须 >= 3 并且 <= 20', min: 3, max: 20, trigger: 'blur' }],
		password: [{ required: true, message: '管理员密码长度必须 >= 5 并且 <= 20', min: 5, max: 20, trigger: 'blur' }]
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

	const formData = ref<CreateAdminParams>({
		name: '',
		account: '',
		password: '',
		authority: [],
		isSuper: false,
		remark: ''
	})

	async function initFormData() {
		const loading = ElLoading.service({ text: '加载中' })
		await getAuthorityOptions()
		loading.close()
		visible.value = true
	}

	function resetFormData() {
		FormRef.value!.resetFields()
	}

	async function submit() {
		try {
			await FormRef.value!.validate()
		} catch (error) {
			ElMessage({
				message: '请保证所有必填项都填写',
				type: 'warning'
			})
			return
		}

		const loading = ElLoading.service({ text: '创建中' })
		const body: CreateAdminParams = formData.value
		const { code, msg } = await admin.createAdmin(body)
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
