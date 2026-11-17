import type { z } from 'zod'
import {
	apiClientPermissionsSchema,
	createApiClientParamsSchema,
	deleteApiClientParamsSchema,
	getApiClientByKeyIdParamsSchema,
	getApiClientListCountParamsSchema,
	getApiClientListParamsSchema,
	getApiClientParamsSchema,
	resetApiClientKeyParamsSchema,
	updateApiClientParamsSchema
} from './schema'

/** API 客户端权限, 增删改查四种权限的组合 */
export type ApiClientPermissions = z.infer<typeof apiClientPermissionsSchema>

/** API 客户端(对外, 不含任何密钥字段) */
export interface ApiClient {
	id: number
	name: string
	remark: string
	permissions: ApiClientPermissions
	isEnabled: boolean
	/** 为空表示永久有效 */
	expireTime: string | null
	createTime: string
	updateTime: string | null
}

/** API 客户端鉴权信息(内部使用, 含密钥校验字段) */
export interface ApiClientAuth {
	id: number
	name: string
	permissions: ApiClientPermissions
	isEnabled: boolean
	expireTime: Date | null
	/** 完整密钥的 SHA-256 值 */
	keyHash: string
}

/** 创建 API 客户端参数类型 */
export type CreateApiClientParams = z.infer<typeof createApiClientParamsSchema>
/** 删除 API 客户端参数类型 */
export type DeleteApiClientParams = z.infer<typeof deleteApiClientParamsSchema>
/** 更新 API 客户端参数类型 */
export type UpdateApiClientParams = z.infer<typeof updateApiClientParamsSchema>
/** 重置 API 客户端密钥参数类型 */
export type ResetApiClientKeyParams = z.infer<typeof resetApiClientKeyParamsSchema>
/** 获取 API 客户端参数类型 */
export type GetApiClientParams = z.infer<typeof getApiClientParamsSchema>
/** 根据密钥标识获取 API 客户端参数类型 */
export type GetApiClientByKeyIdParams = z.infer<typeof getApiClientByKeyIdParamsSchema>
/** 获取 API 客户端列表参数类型 */
export type GetApiClientListParams = z.infer<typeof getApiClientListParamsSchema>
/** 获取 API 客户端数量参数类型 */
export type GetApiClientListCountParams = z.infer<typeof getApiClientListCountParamsSchema>
