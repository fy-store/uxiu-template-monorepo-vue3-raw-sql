import type { Return } from './utils/type'
import type { Admin, GetAdminListParams, UpdateAdminParams, CreateAdminParams } from '@server/index'
import { request } from './utils'

/** 获取管理员列表 */
export const getAdminList = (params: GetAdminListParams): Promise<Return<{ count: number; list: Admin[] }>> =>
	request.get('getAdminList', { params })

/** 删除管理员 */
export const delAdmin = (id: number): Promise<Return> => request.post(`deleteAdmin/${id}`)

/** 更新管理员 */
export const updateAdmin = (params: UpdateAdminParams): Promise<Return> => request.post('updateAdmin', params)

/** 创建管理员 */
export const createAdmin = (params: CreateAdminParams): Promise<Return> => request.post('createAdmin', params)
