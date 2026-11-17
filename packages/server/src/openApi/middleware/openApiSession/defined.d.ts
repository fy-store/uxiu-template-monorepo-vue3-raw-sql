import type { DbApiClient } from '@server/db'

declare module 'koa' {
	interface Context {
		/** openApi 客户端会话仓库, 仅在 openApi 路由中注入 */
		openApiClientStore: DbApiClient
	}

	interface DefaultContext {
		/** openApi 客户端会话仓库, 仅在 openApi 路由中注入 */
		openApiClientStore: DbApiClient
	}
}

export {}
