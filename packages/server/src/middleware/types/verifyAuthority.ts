import type { InspectorType, ReadonlyType } from 'uxiu'
import type { Meta } from '@/conf/types/index.js'
import type { UserSession } from './userSession.js'

declare module 'koa' {
	interface Context {
		/** 用户会话 */
		userSession: UserSession
		/** 用户会话 ID */
		userSessionId: string
	}
}

declare module 'koa-router' {
	interface IRouterParamContext {
		/** 用户会话 */
		userSession: UserSession
		/** 用户会话 ID */
		userSessionId: string
	}
}

export type DeepReadonly<T> = ReadonlyType.DeepReadonly<T>

export type RuleSerialize = InspectorType.RuleSerialize<Meta>
