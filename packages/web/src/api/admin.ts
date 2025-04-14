import type { Return } from './utils/type'
import type { Admin, CreateAdmin, QueryAdmin, UpdateAdmin } from '@t/index'
import { request } from './utils/request'

/** 获取管理员列表 */
export const getAdminList = (params: QueryAdmin): Promise<Return<{ count: number; list: Admin[] }>> =>
	request.get('getAdminList', { params })

/** 删除管理员 */
export const delAdmin = (id: number): Promise<Return> => request.post(`deleteAdmin/${id}`)

/** 更新管理员 */
export const updateAdmin = (id: number, params: UpdateAdmin): Promise<Return> =>
	request.post(`updateAdmin/${id}`, params)

/** 创建管理员 */
export const createAdmin = (params: CreateAdmin): Promise<Return> => request.post('createAdmin', params)
