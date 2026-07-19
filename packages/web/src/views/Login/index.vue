<template>
	<div class="login-page">
		<div class="info-card">
			<div class="brand-pane">
				<div class="logo-circle">{{ project.name.slice(0, 1) }}</div>
				<div class="brand-title">{{ project.name }}</div>
				<div class="brand-sub">{{ project.description }}</div>
			</div>
			<div class="form-pane">
				<h2 class="form-title">登录</h2>
				<el-form
					ref="Form"
					:model="formData"
					:rules="rules"
					size="large"
					label-width="auto"
					label-position="top"
					@submit.prevent
					@keydown.enter.native="submit"
				>
					<el-form-item label="账号" prop="account">
						<el-input v-model="formData.account" placeholder="请输入账号" clearable>
							<template #prefix>
								<el-icon class="input-icon"><i-ep-user /></el-icon>
							</template>
						</el-input>
					</el-form-item>
					<el-form-item label="密码" prop="password">
						<el-input v-model="formData.password" placeholder="请输入密码" show-password clearable>
							<template #prefix>
								<el-icon class="input-icon"><i-ep-lock /></el-icon>
							</template>
						</el-input>
					</el-form-item>
					<el-form-item>
						<el-button class="submit-btn" type="primary" size="large" @click="submit">登 录</el-button>
					</el-form-item>
				</el-form>
			</div>
		</div>
	</div>
	<Bg></Bg>
</template>

<script lang="ts" setup>
	import type { FormRules } from 'element-plus'
	import Bg from './Bg.vue'
	import { persistenceKeys, project } from '@/config'
	import { safe } from 'uxiu/utils'
	import { account } from '@/api'
	import { useRouter } from 'vue-router'
	import { useUserInfo } from '@/stores/useUserInfo'
	import { ref, useTemplateRef } from 'vue'

	const formData = ref({
		account: '',
		password: ''
	})

	const rules: FormRules<typeof formData.value> = {
		account: [{ required: true, message: '请输入账号', trigger: 'blur' }],
		password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
	}

	const router = useRouter()
	const FormRef = useTemplateRef('Form')
	async function submit() {
		const [err] = await safe(async () => {
			await FormRef.value!.validate()
		})
		if (err) {
			ElMessage({
				message: '请保证所有必填项都填写',
				type: 'warning'
			})
			return
		}

		const loading = ElLoading.service({ text: '登录中' })
		const { code, msg, data } = await account.loginAdmin(formData.value)
		loading.close()
		if (code !== 0) {
			ElMessage({
				message: msg,
				type: 'error'
			})
			return
		}

		localStorage.setItem(persistenceKeys.token, data.token)
		localStorage.setItem(
			persistenceKeys.userInfo,
			JSON.stringify({
				name: data.name
			})
		)
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
	.login-page {
		display: grid;
		place-items: center;
		position: relative;
		z-index: 1;
		height: 100dvh;
		padding: 24px;
		box-sizing: border-box;
		transform: translateY(-60px);
	}

	.info-card {
		display: flex;
		width: 100%;
		max-width: 960px;
		min-height: 560px;
		overflow: hidden;
		border-radius: 4px;
		background-color: #fff;
		box-shadow: var(--theme-shadow-base);
	}

	.brand-pane {
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		gap: 8px;
		width: 45%;
		padding: 64px 48px;
		box-sizing: border-box;
		background: linear-gradient(
			135deg,
			var(--theme-color-secondary) 0%,
			color-mix(in oklab, var(--theme-color-secondary) 70%, var(--theme-color-primary)) 100%
		);
		color: #fff;
	}

	.logo-circle {
		display: grid;
		place-items: center;
		width: 72px;
		height: 72px;
		margin-bottom: 18px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.25);
		font-weight: 700;
		font-size: 32px;
	}

	.brand-title {
		margin-bottom: 6px;
		font-size: 26px;
		font-weight: 600;
		line-height: 1.2;
	}

	.brand-sub {
		opacity: 0.9;
		font-size: 14px;
	}

	.form-pane {
		flex: 1;
		padding: 40px;
	}

	.form-title {
		margin: 0 0 20px 0;
		font-size: 22px;
		font-weight: 600;
		text-align: left;
	}

	.input-icon {
		color: var(--theme-color-placeholder);
	}

	.submit-btn {
		width: 100%;
	}

	@media (max-width: 920px) {
		.info-card {
			flex-direction: column;
			max-width: 560px;
			min-height: auto;
		}

		.brand-pane {
			width: 100%;
		}

		.brand-pane {
			padding: 28px 24px;
		}

		.form-pane {
			padding: 24px;
		}
	}
</style>
