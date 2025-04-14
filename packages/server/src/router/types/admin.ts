export type IsSuper = 0 | 1

/** 创建管理员 */
export interface CreateAdmin {
	name?: string
	account: string
	password: string
	isSuper?: IsSuper
	authority: string[]
}

/** 管理员 */
export interface Admin {
	id: number
	name: string
	account: string
	authority: string[]
	createTime: string
	updateTime: string
}

/** 查询管理员 */
export interface QueryAdmin {
	page: number
	size: number
	name?: string
}

/** 查询管理员数量 */
export interface QueryAdminCount {
	name?: string
}

/** 更新管理员信息 */
export interface UpdateAdmin {
	name?: string
	password?: string
	isSuper?: IsSuper
	authority?: string[]
}
