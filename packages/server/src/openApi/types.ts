import type { ApiClientPermissions } from '@server/db/modules/apiClient/types'

/** openApi 鉴权通过后注入的客户端会话 */
export interface OpenApiClientSession {
	/** API 客户端 ID */
	id: number
	/** API 客户端名称 */
	name: string
	/** 增删改查权限组合 */
	permissions: ApiClientPermissions
}
