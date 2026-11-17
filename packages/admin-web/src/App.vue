<template>
	<el-config-provider :locale="zhCn" :message="messageConfig">
		<Home></Home>
	</el-config-provider>
</template>

<script lang="ts" setup>
	import 'dayjs/locale/zh-cn'
	import { ElConfigProvider } from 'element-plus'
	import zhCn from 'element-plus/es/locale/lang/zh-cn'
	import Home from '@/frame/core/layout/Home/index.vue'

	/** 消息提醒全局配置: 默认展示手动关闭按钮 */
	const messageConfig = { showClose: true }
</script>

<style scoped lang="scss"></style>
