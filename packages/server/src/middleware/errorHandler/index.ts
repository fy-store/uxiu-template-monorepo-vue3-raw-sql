import { getType } from '@server/utils'
import type { Context, Next } from 'koa'
import type { ParsedUrlQuery } from 'node:querystring'

export interface ErrorLog {
	requestId: string
	ip: string
	method: string
	url: string
	query: ParsedUrlQuery
	params: Record<string, string | string[]>
	requestContentType?: string
	requestBodyMetaInfo: {
		type: string
		keyLength?: number
	}
	authorization?: string
	sessionId?: string
	customError: any
}

/**
 * 错误处理器
 * - 请确保该中间件是在所有业务之前
 * @returns Koa 中间件
 */
export function errorHandler() {
	return async (ctx: Context, next: Next) => {
		Object.defineProperty(ctx, 'customError', {
			get() {
				return ctx.req.customError
			},
			set(value) {
				ctx.req.customError = value
				return true
			}
		})

		ctx.bus.on('hook:error', (error: any, ctx) => {
			const type = getType(ctx.request.body)
			const info: ErrorLog = {
				requestId: ctx.requestId,
				ip: ctx.ip,
				method: ctx.method,
				url: ctx.url,
				query: ctx.query,
				params: ctx.params,
				requestContentType: ctx.header['content-type'],
				requestBodyMetaInfo: {
					type,
					keyLength: type === 'object' || type === 'array' ? Object.keys(ctx.request.body as object).length : undefined
				},
				authorization: ctx.header.authorization,
				sessionId: ctx.identitySessionId,
				customError: null
			}

			const customError: any = ctx.customError?.message ?? ctx.customError
			info.customError = customError ?? null
			console.error(error)
			console.log('')
			ctx.logger!.businessError.error(info)

			ctx.status = 500
			ctx.body = {
				code: 500,
				msg: customError ?? '服务器发生错误，请稍后再试'
			}
		})

		await next()
	}
}
