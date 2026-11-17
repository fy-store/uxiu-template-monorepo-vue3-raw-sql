import { z } from 'zod'
import { columnsToMap, tableMap } from '@server/config/database'
import { permissionSchema } from '@server/config/authority/schema'
import { MySQLUtil } from '@server/db/utils'

export const columnsMap = columnsToMap(tableMap.admin.columns)

const idSchema = z.int().min(1).max(MySQLUtil.utf8mb4_safeValue.int.max)
const nameSchema = z.string().trim().min(1).max(columnsMap.name.length)
const accountSchema = z.string().trim().min(1).max(columnsMap.account.length)
const passwordSchema = z.string().min(1).max(columnsMap.password.length)
const remarkSchema = z.string().max(columnsMap.remark.length)

/** 创建管理员的参数校验 */
export const createAdminParamsSchema = z.object({
	name: nameSchema,
	account: accountSchema,
	password: passwordSchema,
	isSuper: z.boolean(),
	authority: permissionSchema,
	remark: remarkSchema
})

/** 删除管理员的参数校验 */
export const deleteAdminParamsSchema = z.object({
	id: idSchema
})

/** 更新管理员的参数校验 */
export const updateAdminParamsSchema = z.object({
	id: idSchema,
	name: nameSchema.optional(),
	password: passwordSchema.optional(),
	isSuper: z.boolean().optional(),
	authority: permissionSchema.optional(),
	remark: remarkSchema.optional()
})

/** 获取管理员的参数校验 */
export const getAdminParamsSchema = z.object({
	id: idSchema
})

/** 根据账号获取管理员的参数校验 */
export const getAdminByAccountParamsSchema = z.object({
	account: accountSchema
})

/** 获取管理员列表的参数校验 */
export const getAdminListParamsSchema = z.object({
	page: z.int().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
	size: z.int().min(0).max(1000).optional(),
	name: z.string().optional(),
	account: z.string().optional()
})

/** 获取管理员数量的参数校验 */
export const getAdminCountParamsSchema = z.object({
	name: z.string().optional(),
	account: z.string().optional()
})
