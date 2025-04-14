<template>
	<el-dialog v-model="model" title="更新管理员" width="600px" destroy-on-close>
		<el-form :model="formData" label-width="60px" :rules="rules" ref="Form" @submit.prevent="submit">
			<el-form-item label="名称" prop="name">
				<el-input v-model="formData.name" placeholder="请输入管理员名称" />
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
					:default-checked-keys="formData.authority"
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
	import type { EditFormData } from './type'
	import type { Admin, Authority, IsSuperOption } from '@t/index'
	import type { FormInstance, FormRules } from 'element-plus'
	import { reactive, ref, useTemplateRef, watch } from 'vue'
	import { updateAdmin, getAuthoritySelect, getIsSuperSelect } from '@/api'
	import { useUserInfo } from '@/stores'

	const emit = defineEmits(['success'])
	const model = defineModel({ default: false })
	const { data } = defineProps<{ data: Admin }>()
	const treeProps = {
		label: 'name'
	}
	const userInfo = useUserInfo()
	const authorityOptions = ref<Authority[]>([])
	async function getAuthorityOptions() {
		const { code, msg, data = [] } = await getAuthoritySelect()
		if (code !== 0) {
			ElMessage({ message: msg, type: 'error' })
		}
		authorityOptions.value = data
	}

	function authorityCheck(_: any, { checkedKeys }: { checkedKeys: string[] }) {
		formData.value.authority = checkedKeys
	}

	async function getIsSuperOptions() {
		const { code, msg, data } = await getIsSuperSelect()
		if (code !== 0) {
			ElMessage({ message: msg, type: 'error' })
			isSuperOptions.value = []
			return
		}
		isSuperOptions.value = data.options
	}

	const isSuperOptions = ref<IsSuperOption[]>([])
	const formData = ref<EditFormData>({
		id: -1
	})

	watch(
		() => model.value,
		async function () {
			if (model.value) {
				const loading = ElLoading.service({ text: '加载中' })
				formData.value = { ...data }
				await Promise.all([getAuthorityOptions(), getIsSuperOptions()])
				loading.close()
			}
		},
		{ immediate: true }
	)

	const FormRef = useTemplateRef<FormInstance>('Form')
	const rules = reactive<FormRules<EditFormData>>({
		name: [{ required: true, message: '管理员名称长度必须 >= 1 并且 <= 10', min: 1, max: 10, trigger: 'blur' }],
		password: [{ required: false, message: '管理员密码长度必须 >= 5 并且 <= 12', min: 5, max: 12, trigger: 'blur' }]
	})

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

		const loading = ElLoading.service({ text: '更新中' })
		const { code, msg } = await updateAdmin(formData.value.id, formData.value)
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
