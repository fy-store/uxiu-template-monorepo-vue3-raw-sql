import type { Context, Next } from 'koa'
import { getType } from '@server/utils'
import type { ParsedUrlQuery } from 'node:querystring'

export interface AccessLog {
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
}

/**
 * 访问日志
 */
export function accessLog() {
	return async (ctx: Context, next: Next) => {
		const type = getType(ctx.request.body)
		const content: AccessLog = {
			requestId: ctx.requestId,
			ip: ctx.ip,
			authorization: ctx.header.authorization,
			sessionId: ctx.identitySessionId,
			method: ctx.method,
			url: ctx.url,
			query: ctx.query,
			params: ctx.params,
			requestContentType: ctx.request.type,
			requestBodyMetaInfo: {
				type,
				keyLength: type === 'array' || type === 'object' ? Object.keys(ctx.request.body as object).length : undefined
			}
		}

		ctx.logger!.access.info(content)
		await next()
	}
}
