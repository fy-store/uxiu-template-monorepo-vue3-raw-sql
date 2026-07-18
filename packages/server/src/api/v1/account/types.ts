import type { InspectorMethod } from 'uxiu'
import { z } from 'zod'
import { loginParamsSchema } from './schema'

/** 登录 */
export type LoginParams = z.infer<typeof loginParamsSchema>

/** 权限项 */
export interface AuthorityItem {
	/** 权限ID */
	id: string
	/** 权限名称 */
	name: string
	/** 路由 */
	path: string
	/** 方法 */
	methods: InspectorMethod | InspectorMethod[] | '*'
}

/** 当前账号信息 */
export interface MyInfo {
	/** 管理员 id */
	id: number
	/** 账号 */
	account: string
	/** 用户/管理员名称 */
	name: string
	/** 是否为超管 */
	isSuper?: boolean
	/** 创建时间, utc */
	createTime: string
	/** 权限列表 */
	authority: AuthorityItem[]
	/** 备注 */
	remark?: string
	/** 最大文件授权签名数量 */
	maxFileAuthorizeSign: number
	/** 最后更新时间, ISO */
	updateTime?: string
}
