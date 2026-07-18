import type { Permission } from '@server/config'

export interface Admin {
	id: number
	name: string
	account: string
	authority: Permission
	createTime: string
}

export type AdminAll = Admin & {
	password: string
	isSuper: boolean
	remark: string
	updateTime: string | null
}

export interface GetAdminListParams {
	page?: number
	size?: number
	name?: string
	account?: string
}

export interface GetAdminCountParams {
	name?: string
}

export interface CreateAdminParams {
	name: string
	account: string
	password: string
	isSuper: boolean
	authority: Permission
	remark: string
}

export interface UpdateAdminParams {
	id: number
	name?: string
	password?: string
	isSuper?: boolean
	authority?: Permission
	remark?: string
}
