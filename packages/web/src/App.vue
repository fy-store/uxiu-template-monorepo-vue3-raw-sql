<template>
	<el-config-provider :locale="zhCn">
		<Home></Home>
	</el-config-provider>
</template>

<script lang="ts" setup>
	import 'dayjs/locale/zh-cn'
	import { ElConfigProvider } from 'element-plus'
	import zhCn from 'element-plus/es/locale/lang/zh-cn'
	import Home from '@/framework/core/layout/Home/index.vue'
</script>

<style scoped lang="scss"></style>
