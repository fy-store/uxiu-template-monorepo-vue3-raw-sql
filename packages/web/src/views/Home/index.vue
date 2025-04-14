<template>
	<div class="h-100-p position-relative">
		<h1 class="position-absolute top-50-p left-50-p translate--50_-50-p f-32">欢迎来到{{ project.name }}</h1>
	</div>
</template>

<script lang="ts" setup>
	import { project } from '@/conf'
	import { getMyInfo } from '@/api'
	getMyInfo()
</script>

<style scoped lang="scss"></style>
