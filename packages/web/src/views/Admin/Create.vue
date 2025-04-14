<template>
	<el-button @click="model = true">创建管理员</el-button>
	<el-dialog v-model="model" title="创建管理员" width="600px" destroy-on-close>
		<el-form :model="formData" label-width="60px" :rules="rules" ref="Form" @submit.prevent="submit">
			<el-form-item label="名称">
				<el-input v-model="formData.name" placeholder="请输入管理员名称" />
			</el-form-item>
			<el-form-item label="账号" prop="account">
				<el-input v-model="formData.account" placeholder="请输入管理员账号" />
			</el-form-item>
			<el-form-item label="密码" prop="password">
				<el-input v-model.trim="formData.password" placeholder="请输入管理员密码" type="password" show-password />
			</el-form-item>
			<el-form-item label="超管" v-if="userInfo.info.isSuper">
				<el-select v-model="formData.isSuper" placeholder="Select" class="w-100-p">
					<el-option v-for="item in isSuperOptions" :key="item.id" :label="item.name" :value="item.id" />
				</el-select>
			</el-form-item>
			<el-form-item label="权限">
				<el-tree
					class="w-100-p"
					:data="authorityOptions"
					node-key="id"
					:props="treeProps"
					show-checkbox
					@check="authorityCheck"
				/>
			</el-form-item>
		</el-form>
		<template #footer>
			<div>
				<el-button @click="model = false">取 消</el-button>
				<el-button type="primary" @click="submit">提 交</el-button>
			</div>
		</template>
	</el-dialog>
</template>

<script lang="ts" setup>
	import type { FormInstance, FormRules } from 'element-plus'
	import type { CreateAdmin, Authority, IsSuperOption } from '@t/index'
	import { reactive, ref, useTemplateRef, watch } from 'vue'
	import { createAdmin, getAuthoritySelect, getIsSuperSelect } from '@/api'
	import { useUserInfo } from '@/stores'

	const emit = defineEmits(['success'])
	const model = defineModel({ default: false })
	const treeProps = {
		label: 'name'
	}
	const FormRef = useTemplateRef<FormInstance>('Form')
	const rules = reactive<FormRules<CreateAdmin>>({
		account: [{ required: true, message: '管理员账号长度必须 >= 3 并且 <= 20', min: 3, max: 20, trigger: 'blur' }],
		password: [{ required: false, message: '管理员密码长度必须 >= 5 并且 <= 20', min: 5, max: 20, trigger: 'blur' }]
	})

	const userInfo = useUserInfo()

	const authorityOptions = ref<Authority[]>([])
	async function getAuthorityOptions() {
		const { code, msg, data = [] } = await getAuthoritySelect()
		if (code !== 0) {
			ElMessage({ message: msg, type: 'error' })
		}
		authorityOptions.value = data
	}

	const isSuperOptions = ref<IsSuperOption[]>([])
	async function getIsSuperOptions() {
		const { code, msg, data } = await getIsSuperSelect()
		if (code !== 0) {
			ElMessage({ message: msg, type: 'error' })
			isSuperOptions.value = []
			formData.value.isSuper = void 0
			return
		}
		isSuperOptions.value = data.options
		formData.value.isSuper = data.default
	}

	function authorityCheck(_: any, { checkedKeys }: { checkedKeys: string[] }) {
		formData.value.authority = checkedKeys
	}

	const formData = ref<CreateAdmin>({
		name: void 0,
		account: '',
		password: '',
		authority: [],
		isSuper: void 0
	})

	watch(
		() => model.value,
		async function () {
			if (model.value) {
				const loading = ElLoading.service({ text: '加载中' })
				formData.value = { name: void 0, account: '', password: '', authority: [], isSuper: void 0 }
				await Promise.all([getAuthorityOptions(), getIsSuperOptions()])
				loading.close()
			}
		},
		{ immediate: true }
	)

	async function submit() {
		try {
			await (FormRef.value as FormInstance).validate()
		} catch (error) {
			ElMessage({
				message: '请保证所有必填项都填写',
				type: 'warning'
			})
			return
		}

		const loading = ElLoading.service({ text: '创建中' })
		const { code, msg } = await createAdmin(formData.value)
		loading.close()
		if (code !== 0) {
			ElMessage({
				message: msg,
				type: 'error'
			})
			return
		}

		model.value = false
		emit('success')
		ElMessage({
			message: msg,
			type: 'success'
		})
	}
</script>

<style scoped lang="scss"></style>
