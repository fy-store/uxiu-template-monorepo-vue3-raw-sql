import type { InspectorType } from 'uxiu'
import type { IsSuper } from './admin.js'
import type { Meta } from '@/conf/types/index.js'

export interface QueryUserSession {
	page: number
	size: number
}

export interface UserSession {
	sessionId: string
	sessionValue: {
		id: number
		latelyOperationTimer: number
		ip: string
		isSuper: IsSuper
		authority: InspectorType.RuleSerialize<Meta>[]
		[k: string]: any
	}
}
