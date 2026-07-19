<template>
	<div class="h-full relative">
		<div class="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2">
			<h1 class="text-32px">欢迎来到{{ project.name }}</h1>
			<div class="mt-10px text-16px">{{ project.description }}</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
	import { project } from '@/config'
	import { account } from '@/api'
	account.getMyInfo()
</script>

<style scoped lang="scss"></style>
