import type { ParsedUrlQuery } from 'querystring'

declare module 'koa' {
	interface Context {
		/** 未消除 xss 风险的请求体(未转义), 多个相同参数将合并成数组 */
		query: ParsedUrlQuery
		/** 消除 xss 风险的请求体(已转义), 多个相同参数将合并成数组 */
		xssQuery: ParsedUrlQuery
		/** 未消除 xss 风险的请求体(未转义) */
		params?: Record<string, string>
		/** 消除 xss 风险后的请求体(已转义) */
		xssParams: Record<string, string>
	}

	interface Request {
		/** 未消除 xss 风险的请求体(未转义) */
		body?: any
		/** 消除 xss 风险后的请求体(已转义) */
		xssBody: any
	}
}

declare module 'koa-router' {
	interface IRouterParamContext {
		/** 未消除 xss 风险的请求体(未转义) */
		body: any
		/** 消除 xss 风险后的请求体(已转义) */
		xssBody: any
		/** 未消除 xss 风险的请求体(未转义), 多个相同参数将合并成数组 */
		query: ParsedUrlQuery
		/** 消除 xss 风险的请求体(已转义), 多个相同参数将合并成数组 */
		xssQuery: any
		/** 未消除 xss 风险的请求体(未转义) */
		params: Record<string, string>
		/** 消除 xss 风险后的请求体(已转义) */
		xssParams: Record<string, string>
	}
}
