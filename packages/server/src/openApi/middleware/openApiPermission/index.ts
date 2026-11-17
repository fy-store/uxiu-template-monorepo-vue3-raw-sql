import type { Context, Middleware, Next } from 'koa'
import type { ApiClientPermissions } from '@server/db/modules/apiClient/types'

/** 校验当前 API 客户端是否具备指定权限 */
export function openApiPermission(permission: keyof ApiClientPermissions): Middleware {
	return async (ctx: Context, next: Next) => {
		if (!ctx.openApiClient?.permissions?.[permission]) {
			ctx.body = { code: 403, msg: '权限不足' }
			return
		}
		await next()
	}
}
