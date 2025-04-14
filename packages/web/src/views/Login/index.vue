<template>
	<div class="login-container vh-100">
		<div class="container w-320 pd-30 bg-fff">
			<h2 class="f-32 mb-10 text-center">{{ project.name }}-登录</h2>
			<el-form
				ref="Form"
				:model="formData"
				:rules="rules"
				label-width="auto"
				label-position="top"
				@submit.prevent
				@keydown.enter.native="submit"
			>
				<el-form-item label="账号" prop="account">
					<el-input v-model.trim="formData.account" placeholder="请输入账号" clearable />
				</el-form-item>
				<el-form-item label="密码" prop="password">
					<el-input v-model.trim="formData.password" placeholder="请输入密码" clearable show-password />
				</el-form-item>
				<el-form-item>
					<el-button class="w-100-p" type="primary" @click="submit">登 录</el-button>
				</el-form-item>
			</el-form>
		</div>
	</div>
</template>

<script lang="ts" setup>
	import { project } from '@/conf'
	import type { FormRules, FormInstance } from 'element-plus'
	import { useTemplateRef, reactive } from 'vue'
	import { useRouter } from 'vue-router'
	import { useUserInfo } from '@/stores/useUserInfo'
	import { login } from '@/api'

	const router = useRouter()
	type FormData = {
		account: string
		password: string
	}

	const FormRef = useTemplateRef<FormInstance>('Form')
	const rules = reactive<FormRules<FormData>>({
		account: [{ required: true, message: '请输入账号', trigger: 'blur' }],
		password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
	})
	const formData = reactive<FormData>({
		account: '',
		password: ''
	})

	const submit = async () => {
		try {
			await (FormRef.value as FormInstance).validate()
		} catch (error) {
			ElMessage({
				message: '请保证所有必填项都填写',
				type: 'warning'
			})
			return
		}

		const loading = ElLoading.service({ text: '登录中' })
		const { code, msg, data } = await login(formData)
		loading.close()
		if (code !== 0) {
			ElMessage({
				message: msg,
				type: 'error'
			})
			return
		}

		localStorage.setItem('token', data.token)
		ElMessage({
			message: msg,
			type: 'success'
		})

		const userInfo = useUserInfo()
		userInfo.refresh()
		router.push('/')
	}
</script>

<style scoped lang="scss">
	.login-container {
		min-height: 450px;
		display: flex;
		justify-content: center;
		align-items: flex-start;
		background-color: #f6f7fb;
	}

	.container {
		transform: translateY(20vh);
		border-radius: 4px;
		box-shadow: var(--el-box-shadow);
	}
</style>
