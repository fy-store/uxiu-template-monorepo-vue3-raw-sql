import type { OpenApiClientSession } from '../../types'

declare module 'koa' {
	interface Context {
		/** openApi 客户端会话, 仅在 openApi 鉴权通过后存在 */
		openApiClient?: OpenApiClientSession
	}

	interface DefaultContext {
		/** openApi 客户端会话, 仅在 openApi 鉴权通过后存在 */
		openApiClient?: OpenApiClientSession
	}
}

export {}
