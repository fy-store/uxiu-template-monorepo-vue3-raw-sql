<template>
	<div>分类1书1</div>
	<el-input placeholder="请输入" v-model="value"></el-input>
	<hr />
	<MultiLevelKeepAlive :cacheComponent></MultiLevelKeepAlive>
</template>

<script lang="ts" setup>
	import { ref } from 'vue'
	import MultiLevelKeepAlive from '@/framework/components/MultiLevelKeepAlive/index.vue'
	import { cacheComponent } from '@/config'
	const value = ref('')
</script>

<style scoped lang="scss"></style>
