import type { Context, Next } from 'koa'
import { isEmpty } from 'uxiu'
import xss from 'xss'

export const preventInjection = () => {
	return async (ctx: Context, next: Next) => {
		if (isEmpty(ctx.request.body)) {
			ctx.request.body = {}
		}

		let xssBody = null
		Object.defineProperty(ctx, 'xssBody', {
			get() {
				if (!xssBody) {
					const json = JSON.stringify(ctx.request.body || {})
					xssBody = JSON.parse(xss(json))
					return xssBody
				}
				return xssBody
			}
		})

		Object.defineProperty(ctx.request, 'xssBody', {
			get() {
				if (!xssBody) {
					const json = JSON.stringify(ctx.request.body || {})
					xssBody = JSON.parse(xss(json))
					return xssBody
				}
				return xssBody
			}
		})

		let xssQuery = null,
			xssParams = null

		Object.defineProperties(ctx, {
			xssQuery: {
				get() {
					if (!xssQuery) {
						const json = JSON.stringify(ctx.query || {})
						xssQuery = JSON.parse(xss(json))
						return xssQuery
					}
					return xssQuery
				}
			},

			xssParams: {
				get() {
					if (!xssParams) {
						const json = JSON.stringify(ctx.params || {})
						xssParams = JSON.parse(xss(json))
						return xssParams
					}
					return xssParams
				}
			}
		})

		await next()
	}
}
