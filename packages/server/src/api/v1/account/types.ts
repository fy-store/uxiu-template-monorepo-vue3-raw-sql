import type { RequestInspectorMethod } from 'uxiu'
import { z } from 'zod'
import { loginParamsSchema, updateMyPasswordParamsSchema } from './schema'

/** 登录 */
export type LoginParams = z.infer<typeof loginParamsSchema>

/** 修改当前账号密码参数 */
export type UpdateMyPasswordParams = z.infer<typeof updateMyPasswordParamsSchema>

/** 权限项 */
export interface AuthorityItem {
	/** 权限ID */
	id: string
	/** 权限名称 */
	name: string
	/** 路由 */
	path: string
	/** 方法 */
	methods: RequestInspectorMethod | RequestInspectorMethod[] | '*'
}

/** 当前账号信息(管理员或普通用户) */
export interface MyInfo {
	/** 账号 id */
	id: number
	/** 展示名称, 管理员为 name, 用户为 username */
	name: string
	/** 管理员账号, 仅管理员存在 */
	account?: string
	/** 用户名, 仅普通用户存在 */
	username?: string
	/** 邮箱, 仅普通用户存在 */
	email?: string
	/** 是否为超管, 仅管理员存在 */
	isSuper?: boolean
	/** 账号是否启用, 仅普通用户存在 */
	isEnabled?: boolean
	/** 创建时间, utc */
	createTime: string
	/** 权限列表, 仅管理员存在 */
	authority?: AuthorityItem[]
	/** 备注, 仅管理员存在 */
	remark?: string
	/** 最大文件授权签名数量 */
	maxFileAuthorizeSign?: number
	/** 最后更新时间, ISO */
	updateTime?: string
}
