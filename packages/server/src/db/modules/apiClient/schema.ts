import { z } from 'zod'
import { columnsToMap, tableMap } from '@server/config/database'
import { MySQLUtil } from '@server/db/utils'

export const columnsMap = columnsToMap(tableMap.api_client.columns)

const idSchema = z.int().min(1).max(MySQLUtil.utf8mb4_safeValue.int.max)
const nameSchema = z.string().trim().min(1).max(columnsMap.name.length)
const remarkSchema = z.string().max(columnsMap.remark.length)
const keyIdSchema = z.string().trim().min(1).max(columnsMap.key_id.length)
const keyHashSchema = z.string().trim().min(1).max(columnsMap.key_hash.length)

/** API 客户端权限校验, 增删改查四种权限可自由组合, 缺省为 false */
export const apiClientPermissionsSchema = z.object({
	/** 增: 创建文件信息/目录、OSS 上传签名 */
	create: z.boolean().default(false),
	/** 查: 获取文件信息/列表/访问地址 */
	read: z.boolean().default(false),
	/** 改: 修改文件信息、排序 */
	update: z.boolean().default(false),
	/** 删: 删除文件信息 */
	delete: z.boolean().default(false)
})

/** 创建 API 客户端参数校验 */
export const createApiClientParamsSchema = z.object({
	name: nameSchema,
	remark: remarkSchema.optional(),
	permissions: apiClientPermissionsSchema,
	keyId: keyIdSchema,
	keyHash: keyHashSchema,
	isEnabled: z.boolean().optional(),
	/** 为空表示永久有效 */
	expireTime: z.date().nullable().optional()
})

/** 删除 API 客户端参数校验 */
export const deleteApiClientParamsSchema = z.object({
	id: idSchema
})

/** 更新 API 客户端参数校验 */
export const updateApiClientParamsSchema = z.object({
	id: idSchema,
	name: nameSchema.optional(),
	remark: remarkSchema.optional(),
	permissions: apiClientPermissionsSchema.optional(),
	isEnabled: z.boolean().optional(),
	/** 传 null 表示清除过期时间(永久有效) */
	expireTime: z.date().nullable().optional()
})

/** 重置 API 客户端密钥参数校验 */
export const resetApiClientKeyParamsSchema = z.object({
	id: idSchema,
	keyId: keyIdSchema,
	keyHash: keyHashSchema
})

/** 获取 API 客户端参数校验 */
export const getApiClientParamsSchema = z.object({
	id: idSchema
})

/** 根据密钥标识获取 API 客户端参数校验 */
export const getApiClientByKeyIdParamsSchema = z.object({
	keyId: keyIdSchema
})

/** 获取 API 客户端列表参数校验 */
export const getApiClientListParamsSchema = z.object({
	page: z.int().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
	size: z.int().min(0).max(1000).optional(),
	name: z.string().optional()
})

/** 获取 API 客户端数量的参数校验 */
export const getApiClientListCountParamsSchema = z.object({
	name: z.string().optional()
})
