import type { Context, Next } from 'koa'

/** 访问不存在的资源 */
export function notFound() {
	return async (ctx: Context, next: Next) => {
		ctx.status = 404
		ctx.body = {
			code: 404,
			msg: `${ctx.url} 路径下没有任何资源`
		}
		await next()
	}
}
