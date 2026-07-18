declare module 'koa' {
	interface Context {
		/** 消除 xss 风险的请求体(已转义), 多个相同参数将合并成数组 */
		xssQuery: Record<string, any>
		/** 消除 xss 风险后的请求体(已转义) */
		xssParams: Record<string, string>
	}

	interface DefaultContext {
		/** 消除 xss 风险后的请求体(已转义) */
		xssBody: Record<string, any>
		/** 消除 xss 风险的请求体(已转义), 多个相同参数将合并成数组 */
		xssQuery: Record<string, any>
		/** 消除 xss 风险后的请求体(已转义) */
		xssParams: Record<string, string>
	}

	interface Request {
		/** 消除 xss 风险后的请求体(已转义) */
		xssBody: Record<string, any>
	}
}

export {}
