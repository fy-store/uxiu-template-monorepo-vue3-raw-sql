import type { InspectorType } from 'uxiu'
import type { Meta } from '@/conf/types/index.js'

export type IsSuper = 0 | 1

export interface Admin {
	id: number
	name: string
	account: string
	authority: InspectorType.RuleSerialize<Meta>[]
	createTime: string
	updateTime: string
}

export type AllInfoAdmin = Admin & { password: string; isSuper: IsSuper }

export interface QueryAdmin {
	page: number
	size: number
	name?: string
}

export interface QueryAdminCount {
	name?: string
}

export interface CreateAdmin {
	name?: string
	account: string
	password: string
	isSuper?: IsSuper
	authority: InspectorType.RuleSerialize<Meta>[]
}

export interface UpdateAdmin {
	name: string
	password: string
	isSuper: IsSuper
	authority: InspectorType.RuleSerialize<Meta>[]
}
