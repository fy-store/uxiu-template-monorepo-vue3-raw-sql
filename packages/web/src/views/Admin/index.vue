<template>
	<div class="flex-column h-100-p border-box pd-20">
		<div class="header border-box pd-30 bg-fff radius-4 flex-space-between mb-20">
			<div class="flex">
				<el-input
					class="w-200!"
					clearable
					v-model="searchParams.name"
					placeholder="请输入管理员名称"
					:suffix-icon="Search"
					@change="getTableData"
				></el-input>
			</div>
			<Create @success="getTableData"></Create>
		</div>

		<div class="container flex-1 flex-column bg-fff pd-30 radius-4 min-h-200">
			<el-table :data="tableData" border class="flex-1 border-box" height="100%">
				<el-table-column prop="id" label="ID" align="center" />
				<el-table-column prop="account" label="账号" align="center" />
				<el-table-column prop="name" label="管理员名称" align="center" />
				<el-table-column prop="createTime" label="创建时间" align="center" />
				<el-table-column prop="updateTime" label="更新时间" align="center" />
				<el-table-column label="操作" align="center">
					<template #default="{ row }">
						<el-button link type="primary" @click="edit(row)">编辑</el-button>
						<el-button link type="danger" @click="del(row)">删除</el-button>
					</template>
				</el-table-column>
			</el-table>
			<el-pagination
				class="mt-20 flex-end"
				v-model:current-page="paging.page"
				v-model:page-size="paging.size"
				:page-sizes="[1, 2, 10, 20, 30, 40, 50, 100, 200, 300, 400, 500, 1000, 1500, 2000]"
				layout="total, sizes, prev, pager, next, jumper"
				:total="paging.count"
			/>
		</div>
		<Edit v-model="editVisible" :data="editData" @success="getTableData"></Edit>
	</div>
</template>

<script lang="ts" setup>
	import type { Admin } from '@t/index'
	import type { SearchParams } from './type'
	import { Search } from '@element-plus/icons-vue'
	import { getAdminList, delAdmin } from '@/api'
	import Create from './Create.vue'
	import Edit from './Edit.vue'
	import dayjs from 'dayjs'
	import { ref, onActivated, watch } from 'vue'

	const searchParams = ref<SearchParams>({})

	const paging = ref({
		page: 1,
		size: 20,
		count: 0
	})

	watch(() => paging.value.page, getTableData)
	watch(() => paging.value.size, getTableData)

	const tableData = ref<Admin[]>([])
	async function getTableData() {
		const { name } = searchParams.value
		const { code, data } = await getAdminList({ name, page: paging.value.page, size: paging.value.size })
		if (code !== 0) {
			tableData.value = []
			paging.value.count = 0
			ElMessage.error('获取管理员列表失败')
			return
		}
		const { count, list } = data!
		list.forEach((it) => {
			it.createTime = dayjs(it.createTime).format('YYYY/MM/DD HH:mm:ss')
			it.updateTime = dayjs(it.updateTime).format('YYYY/MM/DD HH:mm:ss')
		})
		tableData.value = list
		paging.value.count = count
	}

	getTableData()
	onActivated(getTableData)

	async function del(row: Admin) {
		try {
			await ElMessageBox.confirm(`确认删除管理员 "${row.name}" ?`, '注意', {
				confirmButtonText: '确 认',
				cancelButtonText: '取 消',
				type: 'warning'
			})
		} catch (error) {
			if (error instanceof Error) throw error
			return
		}

		const { code, msg } = await delAdmin(row.id)
		if (code !== 0) {
			ElMessage.error(msg)
			return
		}
		getTableData()
		ElMessage.success(msg)
	}

	const editVisible = ref(false)
	const editData = ref({} as Admin)
	function edit(row: Admin) {
		editData.value = row
		editVisible.value = true
	}
</script>

<style scoped lang="scss">
	.header,
	.container {
		border: 1px solid var(--el-border-color);
	}
</style>
