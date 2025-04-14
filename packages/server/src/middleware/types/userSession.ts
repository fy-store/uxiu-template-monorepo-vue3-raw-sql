import { Session } from 'uxiu'
import type { ReadonlyType } from 'uxiu'
import type { UserSession as _UserSession } from '#db'

declare module 'koa' {
	interface Context {
		/** 用户会话仓库 */
		userSessionStore: ReturnType<typeof Session.createSessionStore>
	}
}

declare module 'koa-router' {
	interface IRouterParamContext {
		/** 用户会话仓库 */
		userSessionStore: ReturnType<typeof Session.createSessionStore>
	}
}

export type UserSession = ReadonlyType.DeepReadonly<_UserSession['sessionValue']>
