<template>
	<div class="h-full box-border flex flex-col">
		<div class="page-toolbar">
			<var-input
				class="search-field"
				clearable
				v-model="searchParams.name"
				placeholder="请输入管理员名称"
				:hint="false"
				@change="getTableData"
			>
				<template #prepend-icon>
					<var-icon name="magnify" />
				</template>
			</var-input>
			<var-button class="icon-button" text round @click="getTableData">
				<var-icon name="refresh" />
			</var-button>
			<Create @success="getTableData"></Create>
		</div>

		<div class="list-scroll min-h-0 flex-1 overflow-y-auto p-12px">
			<var-result v-if="tableData.length === 0 && !isLoading" type="empty" description="暂无管理员"></var-result>
			<div v-else class="flex flex-col gap-12px">
				<div v-for="row in tableData" :key="row.id" class="list-card">
					<div class="flex flex-wrap items-center justify-between gap-6px">
						<div class="card-title">{{ row.name }}</div>
						<div class="card-subtitle">{{ row.account }}</div>
					</div>
					<div class="card-meta">
						<span>超管: {{ row.isSuper ? '是' : '否' }}</span>
						<span>创建时间: {{ row.createTime }}</span>
						<span v-if="userInfo.info?.isSuper && row.updateTime">更新时间: {{ row.updateTime }}</span>
					</div>
					<div class="mt-10px flex justify-end gap-8px">
						<var-button size="small" text @click="viewAuthority(row)">预览权限</var-button>
						<var-button size="small" text type="primary" @click="edit(row)">编辑</var-button>
						<var-button size="small" text type="danger" @click="del(row)">删除</var-button>
					</div>
				</div>
			</div>
			<div v-if="paging.count > paging.size" class="mt-12px flex justify-center">
				<Pagination :simple="true"></Pagination>
			</div>
		</div>
		<Edit v-model="editVisible" :data="editData" @success="getTableData"></Edit>
		<ViewAuthority v-model="viewAuthorityVisible" :data="viewAuthorityData"></ViewAuthority>
	</div>
</template>

<script lang="ts" setup>
	import type { Admin } from '@server/api/v1/admin'
	import type { SearchParams } from './types'
	import { admin } from '@/api'
	import { useUserInfo } from '@/stores'
	import { usePagination } from '@/framework/hooks/usePagination'
	import Create from './Create.vue'
	import Edit from './Edit.vue'
	import ViewAuthority from './ViewAuthority.vue'
	import dayjs from 'dayjs'
	import { ref } from 'vue'
	import { confirm, message } from '@/framework/utils'

	// 列表
	const userInfo = useUserInfo()
	const searchParams = ref<SearchParams>({})
	const { Pagination, paging } = usePagination({ getList: getTableData })
	const tableData = ref<Admin[]>([])
	const isLoading = ref(false)
	async function getTableData() {
		isLoading.value = true
		try {
			const { name } = searchParams.value
			const { code, msg, data } = await admin.adminList({ name, page: paging.page, size: paging.size })
			if (code !== 0) {
				tableData.value = []
				paging.count = 0
				message.error(msg)
				return
			}
			const { count = 0, list = [] } = data ?? {}
			list.forEach((it) => {
				it.createTime = dayjs(it.createTime).format('YYYY-MM-DD HH:mm:ss')
				if (it.updateTime) {
					it.updateTime = dayjs(it.updateTime).format('YYYY-MM-DD HH:mm:ss')
				}
			})
			tableData.value = list
			paging.count = count
		} finally {
			isLoading.value = false
		}
	}

	// 删除
	async function del(row: unknown) {
		const adminRow = row as Admin
		const isConfirmed = await confirm(`确认删除管理员 "${adminRow.name}" ?`)
		if (!isConfirmed) return

		const { code, msg } = await admin.delAdmin(adminRow.id)
		if (code !== 0) {
			message.error(msg)
			return
		}
		getTableData()
		message.success(msg)
	}

	// 编辑
	const editVisible = ref(false)
	const editData = ref({} as Admin)
	function edit(row: unknown) {
		editData.value = row as Admin
		editVisible.value = true
	}

	// 预览权限
	const viewAuthorityVisible = ref(false)
	const viewAuthorityData = ref({} as Admin)
	function viewAuthority(row: unknown) {
		viewAuthorityData.value = row as Admin
		viewAuthorityVisible.value = true
	}
</script>
