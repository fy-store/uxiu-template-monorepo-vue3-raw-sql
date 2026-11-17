import { z } from 'zod'
import {
	createAdminParamsSchema,
	deleteAdminParamsSchema,
	getAdminListParamsSchema,
	updateAdminParamsSchema
} from './schema'

/** 管理员(提供给前端) */
export interface Admin {
	id: number
	name: string
	account: string
	/** 权限 id 列表 */
	authority: string[]
	createTime: string
	maxFileAuthorizeSign: number
	isSuper?: boolean
	updateTime?: string | null
	remark?: string
}

/** 创建管理员 */
export type CreateAdminParams = z.infer<typeof createAdminParamsSchema>

/** 删除管理员 */
export type DeleteAdminParams = z.infer<typeof deleteAdminParamsSchema>

/** 查询管理员列表 */
export type GetAdminListParams = z.infer<typeof getAdminListParamsSchema>

/** 更新管理员 */
export type UpdateAdminParams = z.infer<typeof updateAdminParamsSchema>
