import type { Context, Middleware, Next } from 'koa'
import { DbApiClient } from '@server/db'

/**
 * 注入 openApi 客户端会话仓库。
 *
 * 与管理员侧的 identitySession 对称, 供后续鉴权中间件与业务读取 API 客户端数据。
 */
export function openApiSession(): Middleware {
	return async (ctx: Context, next: Next) => {
		ctx.openApiClientStore = new DbApiClient({ ctx })
		await next()
	}
}
