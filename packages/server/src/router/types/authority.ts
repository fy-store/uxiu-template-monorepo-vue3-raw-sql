import type { IsSuper } from './admin.js'

export interface Authority {
	id: string
	name: string
	children?: Authority[]
}

export interface IsSuperOption {
	id: number
	name: string
}

export interface IsSuperSelect {
	default: IsSuper
	options: IsSuperOption[]
}
