import type { z } from 'zod'
import type { Permission } from '@server/config'
import {
	createAdminParamsSchema,
	deleteAdminParamsSchema,
	getAdminByAccountParamsSchema,
	getAdminCountParamsSchema,
	getAdminListParamsSchema,
	getAdminParamsSchema,
	updateAdminParamsSchema
} from './schema'

export interface Admin {
	id: number
	name: string
	account: string
	authority: Permission
	createTime: string
}

export type AdminAll = Admin & {
	password: string
	isSuper: boolean
	remark: string
	updateTime: string | null
}

/** 创建管理员参数类型 */
export type CreateAdminParams = z.infer<typeof createAdminParamsSchema>
/** 删除管理员参数类型 */
export type DeleteAdminParams = z.infer<typeof deleteAdminParamsSchema>
/** 更新管理员参数类型 */
export type UpdateAdminParams = z.infer<typeof updateAdminParamsSchema>
/** 获取管理员参数类型 */
export type GetAdminParams = z.infer<typeof getAdminParamsSchema>
/** 根据账号获取管理员参数类型 */
export type GetAdminByAccountParams = z.infer<typeof getAdminByAccountParamsSchema>
/** 获取管理员列表参数类型 */
export type GetAdminListParams = z.infer<typeof getAdminListParamsSchema>
/** 获取管理员数量参数类型 */
export type GetAdminCountParams = z.infer<typeof getAdminCountParamsSchema>
