<template>
	<div>分类2</div>
	<el-input placeholder="请输入" v-model="value"></el-input>
	<hr />
	<router-view></router-view>
</template>

<script lang="ts" setup>
	import { ref } from 'vue'
	const value = ref('')
</script>

<style scoped lang="scss"></style>
