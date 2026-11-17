<template>
	<!-- 保持页面为单根节点, 页面切换动画需要单根节点才能生效 -->
	<div ref="rootRef" class="login-root" @focusin="handleFocusIn" @focusout="handleFocusOut">
		<div ref="pageRef" class="login-page">
			<div class="info-card">
				<div class="brand-pane">
					<div class="logo-circle">{{ project.name.slice(0, 1) }}</div>
					<div class="brand-title">{{ project.name }}</div>
					<div class="brand-sub">{{ project.description }}</div>
				</div>
				<div class="form-pane">
					<h2 class="form-title">登录</h2>
					<var-form class="login-form" @submit="submit">
						<var-input
							v-model="formData.account"
							placeholder="请输入账号"
							clearable
							:rules="[(v: string) => !!v || '请输入账号']"
						>
							<template #prepend-icon>
								<var-icon name="account-circle-outline" />
							</template>
						</var-input>
						<var-input
							v-model="formData.password"
							type="password"
							placeholder="请输入密码"
							clearable
							:rules="[(v: string) => !!v || '请输入密码']"
						>
							<template #prepend-icon>
								<var-icon name="lock-outline" />
							</template>
						</var-input>
						<var-button class="submit-btn" type="primary" block size="large" native-type="submit" :loading="submitting">
							登 录
						</var-button>
					</var-form>
				</div>
			</div>
		</div>
		<Bg></Bg>
	</div>
</template>

<script lang="ts" setup>
	import Bg from './Bg.vue'
	import { persistenceKeys, project } from '@/config'
	import { account } from '@/api'
	import { useRouter } from 'vue-router'
	import { useUserInfo } from '@/stores/useUserInfo'
	import { onBeforeUnmount, onMounted, ref } from 'vue'
	import { message } from '@/framework/utils'

	const formData = ref({
		account: '',
		password: ''
	})
	const submitting = ref(false)

	/** 页面根节点, 承载可视视口尺寸变量 */
	const rootRef = ref<HTMLElement>()
	/** 页面滚动容器, 用于滚动聚焦的输入框 */
	const pageRef = ref<HTMLElement>()
	/** 当前聚焦的输入框 */
	let focusedField: HTMLElement | null = null
	/** 校正输入框位置的延时器 */
	let scrollTimer: number | undefined

	/** 输入框距页面可视边缘的最小安全间距(px) */
	const FIELD_VISIBLE_MARGIN = 16
	/** 聚焦后等待键盘动画结束再校正输入框位置的延时(毫秒) */
	const FOCUS_SCROLL_DELAY = 300
	/** 可视视口变化后重新校正输入框位置的延时(毫秒) */
	const RESIZE_SCROLL_DELAY = 120

	/**
	 * 同步可视视口尺寸与偏移到根节点 CSS 变量。
	 * - 键盘弹起时可视视口缩小, 页面高度随之收缩, 输入框通过内部滚动避免被键盘遮挡
	 * - 浏览器平移可视视口避让输入框时同步偏移, 避免页面与可视区域错位
	 */
	function syncViewport() {
		const viewport = window.visualViewport
		const root = rootRef.value
		if (!viewport || !root) return

		root.style.setProperty('--login-viewport-height', `${viewport.height}px`)
		root.style.setProperty('--login-viewport-offset-top', `${viewport.offsetTop}px`)
	}

	/**
	 * 聚焦输入框未完整显示在页面可视区域内时, 滚动页面使其位于可视区中间。
	 */
	function ensureFieldVisible() {
		const field = focusedField
		const page = pageRef.value
		if (!field || !page || !field.isConnected) return

		const fieldRect = field.getBoundingClientRect()
		const pageRect = page.getBoundingClientRect()
		const isVisible =
			fieldRect.top >= pageRect.top + FIELD_VISIBLE_MARGIN &&
			fieldRect.bottom <= pageRect.bottom - FIELD_VISIBLE_MARGIN
		if (isVisible) return

		field.scrollIntoView({ block: 'center', behavior: 'smooth' })
	}

	/**
	 * 延迟校正聚焦输入框的位置。
	 * @param delay 延迟毫秒数, 等待键盘动画或页面收缩结束。
	 */
	function scheduleEnsureFieldVisible(delay: number) {
		window.clearTimeout(scrollTimer)
		scrollTimer = window.setTimeout(ensureFieldVisible, delay)
	}

	/**
	 * 输入框聚焦时记录目标, 并在键盘弹起后保证输入框不被遮挡。
	 * @param event 聚焦事件。
	 */
	function handleFocusIn(event: FocusEvent) {
		const target = event.target
		if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) return

		focusedField = target
		scheduleEnsureFieldVisible(FOCUS_SCROLL_DELAY)
	}

	/** 输入框失焦时清除聚焦目标 */
	function handleFocusOut() {
		window.clearTimeout(scrollTimer)
		focusedField = null
	}

	/** 可视视口缩放(键盘弹起/收起)时同步页面尺寸, 聚焦中并重新校正输入框位置 */
	function handleViewportResize() {
		syncViewport()
		if (focusedField) scheduleEnsureFieldVisible(RESIZE_SCROLL_DELAY)
	}

	/** 可视视口平移(浏览器避让键盘)时同步页面偏移, 保持与可视区域对齐 */
	function handleViewportScroll() {
		syncViewport()
	}

	onMounted(() => {
		syncViewport()
		window.visualViewport?.addEventListener('resize', handleViewportResize)
		window.visualViewport?.addEventListener('scroll', handleViewportScroll)
	})

	onBeforeUnmount(() => {
		window.clearTimeout(scrollTimer)
		window.visualViewport?.removeEventListener('resize', handleViewportResize)
		window.visualViewport?.removeEventListener('scroll', handleViewportScroll)
	})

	const router = useRouter()
	/**
	 * 提交登录表单。
	 * @param valid 表单校验是否通过。
	 */
	async function submit(valid: boolean) {
		if (submitting.value) return
		if (!valid) {
			message.warning('请保证所有必填项都填写')
			return
		}

		submitting.value = true
		try {
			const { code, msg, data } = await account.loginAdmin(formData.value)
			if (code !== 0) {
				message.error(msg)
				return
			}

			localStorage.setItem(persistenceKeys.token, data!.token)
			localStorage.setItem(
				persistenceKeys.userInfo,
				JSON.stringify({
					name: data!.name
				})
			)
			message.success(msg)

			const userInfo = useUserInfo()
			await userInfo.refreshInfo()
			router.push('/')
		} finally {
			submitting.value = false
		}
	}
</script>

<style scoped lang="scss">
	.login-page {
		display: flex;
		position: relative;
		z-index: 1;
		/* 键盘弹起时可视视口缩小, 页面高度随之收缩, 输入框通过内部滚动避免被键盘遮挡 */
		height: var(--login-viewport-height, 100dvh);
		overflow-y: auto;
		overscroll-behavior: contain;
		/* 浏览器平移可视视口避让键盘时, 页面同步平移, 保持与可视区域对齐 */
		transform: translateY(var(--login-viewport-offset-top, 0px));
		padding: max(24px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right))
			max(24px, env(safe-area-inset-bottom)) max(24px, env(safe-area-inset-left));
		box-sizing: border-box;
	}

	.info-card {
		display: flex;
		flex-direction: column;
		/* 滚动容器内使用 margin auto 居中, 内容超出时顶部不会被裁切 */
		margin: auto;
		width: 100%;
		max-width: 560px;
		overflow: hidden;
		border-radius: 12px;
		background-color: #fff;
		box-shadow: var(--theme-shadow-base);
	}

	.brand-pane {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 32px 24px;
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
		width: 56px;
		height: 56px;
		margin-bottom: 10px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.25);
		font-weight: 700;
		font-size: 26px;
	}

	.brand-title {
		margin-bottom: 6px;
		font-size: 22px;
		font-weight: 600;
		line-height: 1.2;
	}

	.brand-sub {
		opacity: 0.9;
		font-size: 14px;
	}

	.form-pane {
		padding: 24px;
	}

	.form-title {
		margin: 0 0 16px 0;
		font-size: 20px;
		font-weight: 600;
		text-align: left;
	}

	.login-form {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.submit-btn {
		margin-top: 4px;
	}
</style>
