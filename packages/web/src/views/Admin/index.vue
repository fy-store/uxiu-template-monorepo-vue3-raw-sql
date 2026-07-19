<template>
	<div class="h-full box-border flex flex-col p-20px">
		<div class="header mb-20px box-border flex flex-wrap justify-between rounded-4px bg-white p-30px">
			<div class="flex">
				<el-input
					class="w-200px!"
					clearable
					v-model="searchParams.name"
					placeholder="请输入管理员名称"
					:suffix-icon="Search"
					@change="getTableData"
				></el-input>
				<el-button @click="getTableData" class="ml-10px"><i-ep-refresh class="mr-5px text-12px" />刷新</el-button>
			</div>
			<Create @success="getTableData"></Create>
		</div>

		<div class="container min-h-200px flex flex-1 flex-col rounded-4px bg-white p-30px">
			<el-table :data="tableData" border stripe highlight-current-row class="box-border flex-1" height="100%">
				<el-table-column min-width="100" prop="account" label="账号" align="center" />
				<el-table-column min-width="100" prop="name" label="管理员名称" align="center" />
				<el-table-column
					min-width="100"
					prop="isSuper"
					label="是否超管"
					align="center"
					v-if="userInfoStore.info.isSuper"
				>
					<template #default="{ row }">
						<el-tag v-if="row.isSuper">是</el-tag>
						<el-tag v-else type="info">否</el-tag>
					</template>
				</el-table-column>
				<el-table-column min-width="100" prop="authority" label="权限列表" align="center">
					<template #default="{ row }">
						<el-link @click="viewAuthority(row)">预览</el-link>
					</template>
				</el-table-column>
				<el-table-column min-width="100" prop="createTime" label="创建时间" align="center" />
				<el-table-column
					min-width="100"
					prop="updateTime"
					label="更新时间"
					align="center"
					v-if="userInfoStore.info.isSuper"
				/>
				<el-table-column min-width="110" label="操作" align="center" fixed="right">
					<template #default="{ row }">
						<el-button link type="primary" @click="edit(row)">编辑</el-button>
						<el-button link type="danger" @click="del(row)">删除</el-button>
					</template>
				</el-table-column>
			</el-table>
			<div class="mt-20px flex flex-wrap justify-end">
				<Pagination></Pagination>
			</div>
		</div>
		<Edit v-model="editVisible" :data="editData" @success="getTableData"></Edit>
		<ViewAuthority v-model="viewAuthorityVisible" :data="viewAuthorityData"></ViewAuthority>
	</div>
</template>

<script lang="ts" setup>
	import type { Admin } from '@server/index'
	import type { SearchParams } from './types'
	import { admin } from '@/api'
	import { useUserInfo } from '@/stores'
	import { Search } from '@element-plus/icons-vue'
	import { usePagination } from '@/framework/hooks/usePagination'
	import Create from './Create.vue'
	import Edit from './Edit.vue'
	import ViewAuthority from './ViewAuthority.vue'
	import dayjs from 'dayjs'
	import { ref } from 'vue'

	// 列表
	const userInfoStore = useUserInfo()
	const searchParams = ref<SearchParams>({})
	const { Pagination, paging } = usePagination({ getList: getTableData })
	const tableData = ref<Admin[]>([])
	async function getTableData() {
		const { name } = searchParams.value
		const { code, msg, data } = await admin.getAdminList({ name, page: paging.page, size: paging.size })
		if (code !== 0) {
			tableData.value = []
			paging.count = 0
			ElMessage.error(msg)
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
	}

	// 删除
	async function del(row: unknown) {
		const adminRow = row as Admin
		try {
			await ElMessageBox.confirm(`确认删除管理员 "${adminRow.name}" ?`, '注意', {
				confirmButtonText: '确 认',
				cancelButtonText: '取 消',
				type: 'warning'
			})
		} catch (error) {
			if (error instanceof Error) throw error
			return
		}

		const { code, msg } = await admin.delAdmin(adminRow.id)
		if (code !== 0) {
			ElMessage.error(msg)
			return
		}
		getTableData()
		ElMessage.success(msg)
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

<style scoped lang="scss">
	.header,
	.container {
		border: 1px solid var(--theme-color-border);
	}
</style>
