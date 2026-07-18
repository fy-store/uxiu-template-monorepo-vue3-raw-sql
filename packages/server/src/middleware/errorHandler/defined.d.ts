declare module 'koa' {
	interface Context {
		/**
		 * 自定义请求错误, 当路由发生请求错误时返回给前端的错误信息
		 * - [ctx | req].customError 属同一操作
		 * - 设置的错误信息将被 errorHandler 使用
		 */
		customError?: Error | null
	}

	interface DefaultContext {
		/**
		 * 自定义请求错误, 当路由发生请求错误时返回给前端的错误信息
		 * - [ctx | req].customError 属同一操作
		 * - 设置的错误信息将被 errorHandler 使用
		 */
		customError?: Error | null
	}

	interface IncomingMessage {
		/**
		 * 自定义请求错误, 当路由发生请求错误时返回给前端的错误信息
		 * - [ctx | req].customError 属同一操作
		 * - 设置的错误信息将被 errorHandler 使用
		 */
		customError?: Error | null
	}
}

export {}
