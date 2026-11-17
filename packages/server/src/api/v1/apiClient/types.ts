import type { z } from 'zod'
import type {
	apiClientPermissionsSchema,
	createApiClientParamsSchema,
	deleteApiClientParamsSchema,
	getApiClientListParamsSchema,
	resetApiClientKeyParamsSchema,
	updateApiClientParamsSchema
} from './schema'

/** API 客户端权限, 增删改查四种权限的组合 */
export type ApiClientPermissions = z.infer<typeof apiClientPermissionsSchema>

/** API 客户端(提供给前端, 不含任何密钥字段) */
export interface ApiClient {
	id: number
	name: string
	remark: string
	permissions: ApiClientPermissions
	/** 授权目录路径, `/` 表示根目录下所有 */
	paths: string[]
	isEnabled: boolean
	/** 为空表示永久有效 */
	expireTime: string | null
	createTime: string
	updateTime: string | null
}

/** 创建 API 客户端 */
export type CreateApiClientParams = z.infer<typeof createApiClientParamsSchema>

/** 更新 API 客户端 */
export type UpdateApiClientParams = z.infer<typeof updateApiClientParamsSchema>

/** 重置 API 客户端密钥 */
export type ResetApiClientKeyParams = z.infer<typeof resetApiClientKeyParamsSchema>

/** 删除 API 客户端 */
export type DeleteApiClientParams = z.infer<typeof deleteApiClientParamsSchema>

/** 获取 API 客户端列表 */
export type GetApiClientListParams = z.infer<typeof getApiClientListParamsSchema>

/** 创建 API 客户端返回数据, 密钥仅此一次返回 */
export interface CreateApiClientResult {
	id: number
	/** 授权密钥, 仅在创建时返回一次 */
	key: string
}

/** 重置 API 客户端密钥返回数据, 密钥仅此一次返回 */
export interface ResetApiClientKeyResult {
	/** 授权密钥, 仅在重置时返回一次 */
	key: string
}

/** 获取 API 客户端列表返回数据 */
export interface GetApiClientListResult {
	list: ApiClient[]
	count: number
}
