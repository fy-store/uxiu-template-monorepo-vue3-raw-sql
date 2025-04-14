import type { Authority } from './authority.js'
import type { IsSuper } from './admin.js'

export interface Login {
	account: string
	password: string
}

export interface MyInfo {
	id: number
	account: string
	name: string
	isSuper?: IsSuper
	createTime: string
	updateTime: string
	authority: Authority[]
}
