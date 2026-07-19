<template>
	<div>
		<el-button class="btn" @click="$router.push('/books')">/books</el-button>
		<el-button class="btn" @click="$router.push('/books/classify1')">/books/classify1</el-button>
		<el-button class="btn" @click="$router.push('/books/classify1/book1')">/books/classify1/book1</el-button>
		<el-button class="btn" @click="$router.push('/books/classify1/book1/page1')"
			>/books/classify1/book1/page1</el-button
		>
		<el-button class="btn" @click="$router.push('/books/classify1/book2')">/books/classify1/book2</el-button>
		<el-button class="btn" @click="$router.push('/books/classify2')">/books/classify2</el-button>
		<el-button class="btn" @click="$router.push('/books/classify2/book1')">/books/classify2/book1</el-button>
		<el-button class="btn" @click="$router.push('/books/classify2/book2')">/books/classify2/book2</el-button>
	</div>
	<div>书库</div>
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

<style scoped lang="scss">
	.btn {
		margin: 3px;
	}
</style>
