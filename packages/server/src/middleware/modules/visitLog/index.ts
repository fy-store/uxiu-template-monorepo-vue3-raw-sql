import { isArray, isObject, isReferenceValue } from 'uxiu'
import { logger } from '#common'
import type { Context, Next } from 'koa'

export const visitLog = () => {
	return async (ctx: Context, next: Next) => {
		await next()
		if (ctx.method.toLocaleUpperCase() === 'GET') {
			logger.visit.log(
				JSON.stringify(
					{
						ip: ctx.ip,
						method: ctx.method,
						url: ctx.url,
						query: ctx.query,
						params: ctx.params,
						body: ctx.request.body,
						authorization: ctx.header.authorization,
						userSessionId: ctx.userSessionId,
						userSession: ctx.userSession,
						return: isObject(ctx.body) ? hideData(ctx.body) : ctx.body
					},
					null,
					2
				)
			)
		} else {
			logger.visit.log(
				JSON.stringify(
					{
						ip: ctx.ip,
						method: ctx.method,
						url: ctx.url,
						query: ctx.query,
						params: ctx.params,
						body: ctx.request.body,
						authorization: ctx.header.authorization,
						userSessionId: ctx.userSessionId,
						userSession: ctx.userSession,
						return: ctx.body
					},
					null,
					2
				)
			)
		}
	}
}

const hideData = (data: object) => {
	const newData = {}
	Object.entries(data).forEach(([k, v]) => {
		if (isReferenceValue(v)) {
			newData[k] = isArray(v) ? `tip: 日志隐藏数据, data -> length = ${v.length}` : String(v)
		} else {
			newData[k] = v
		}
	})
	return newData
}
