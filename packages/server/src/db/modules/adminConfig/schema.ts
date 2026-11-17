import { z } from 'zod'
import { MySQLUtil } from '@server/db/utils'

const adminIdSchema = z.int().min(1).max(MySQLUtil.utf8mb4_safeValue.int.max)

/** 个性化配置内容校验 */
export const adminConfigValueSchema = z.object({
	themeId: z.string().trim().min(1).max(50)
})

/** 获取管理员个性化配置参数校验 */
export const getAdminConfigParamsSchema = z.object({
	adminId: adminIdSchema
})

/** 创建或更新管理员个性化配置参数校验 */
export const upsertAdminConfigParamsSchema = z.object({
	adminId: adminIdSchema,
	value: adminConfigValueSchema
})
