import { sessionStore } from './index'
declare module 'koa' {
	interface Context {
		/** 会话仓库 */
		identitySessionStore: typeof sessionStore
	}

	interface DefaultContext {
		/** 会话仓库 */
		identitySessionStore: typeof sessionStore
	}
}

export {}
