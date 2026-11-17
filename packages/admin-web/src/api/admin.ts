import type { PromiseReturn } from './utils/type'
import type { Admin, GetAdminListParams, UpdateAdminParams, CreateAdminParams } from '@server/api/v1/admin'
import { request } from './utils'

/** 获取管理员列表 */
export function adminList(params: GetAdminListParams): PromiseReturn<{ count: number; list: Admin[] }> {
	return request.get('adminList', { params })
}

/** 删除管理员 */
export function delAdmin(id: number): PromiseReturn {
	return request.post(`deleteAdmin/${id}`)
}

/** 更新管理员 */
export function updateAdmin(params: UpdateAdminParams): PromiseReturn {
	return request.post('updateAdmin', params)
}

/** 创建管理员 */
export function createAdmin(params: CreateAdminParams): PromiseReturn {
	return request.post('createAdmin', params)
}
