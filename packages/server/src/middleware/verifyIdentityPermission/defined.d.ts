import type { IdentitySession } from '@server/config/index.ts'

declare module 'koa' {
	interface Context {
		/** 会话 ID, 白名单路由不存在 */
		identitySessionId?: string
		/** 会话, 白名单路由不存在 */
		identitySessionInfo?: IdentitySession
	}

	interface DefaultContext {
		/** 会话 ID, 白名单路由不存在 */
		identitySessionId?: string
		/** 会话, 白名单路由不存在 */
		identitySessionInfo?: IdentitySession
	}
}

export {}
