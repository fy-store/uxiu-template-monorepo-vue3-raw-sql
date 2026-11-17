import { z } from 'zod'
import { columnsToMap, tableMap } from '@server/config/database'
import { permissionSchema } from '@server/config/authority/schema'
import { MySQLUtil } from '@server/db/utils'

export const columnsMap = columnsToMap(tableMap.session_info.columns)

const idSchema = z.string().trim().min(1).max(columnsMap.id.length)

/** 身份会话信息校验 */
export const identitySessionSchema = z.object({
	id: z.string().min(1),
	ip: z.string(),
	latelyOperationTimer: z.int().min(0).max(Number.MAX_SAFE_INTEGER),
	info: z.object({
		id: z.int().min(1).max(MySQLUtil.utf8mb4_safeValue.int.max),
		/** 身份类型: 管理员 或 普通用户 */
		type: z.enum(['admin', 'user']),
		isSuper: z.boolean()
	}),
	permission: permissionSchema,
	/** 文件访问 key ID, 当前会话可能未设置 */
	fileRequestKeyId: z.int().min(0).max(MySQLUtil.utf8mb4_safeValue.int.max).optional()
})

/** 创建会话的参数校验 */
export const createSessionParamsSchema = z.object({
	id: idSchema,
	value: identitySessionSchema
})

/** 删除会话的参数校验 */
export const deleteSessionParamsSchema = z.object({
	id: idSchema
})

/** 更新会话的参数校验 */
export const updateSessionParamsSchema = z.object({
	id: idSchema,
	value: identitySessionSchema
})

/** 获取会话的参数校验 */
export const getSessionParamsSchema = z.object({
	id: idSchema
})

/** 获取会话列表的参数校验 */
export const getSessionListParamsSchema = z.object({
	page: z.int().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
	size: z.int().min(0).max(1000).optional()
})
