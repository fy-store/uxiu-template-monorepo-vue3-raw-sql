import type { RequestInspectorMethod, RequestInspectorRuleSerialize } from 'uxiu'

/** 权限项元数据 */
export interface AuthMeta {
	/** 唯一标识 */
	id: string
	/** 权限名称 */
	name: string
}

/** api 和菜单的权限项(具体权限结果) */
export type PermissionItem = RequestInspectorRuleSerialize<AuthMeta>

/** api 和菜单的权限列表(具体权限结果) */
export type Permission = PermissionItem[]

/**当前身份会话 */
export interface IdentitySession {
	/** 会话ID */
	id: string
	/** 用户IP地址 */
	ip: string
	/** 最后活跃时间戳 */
	latelyOperationTimer: number
	/** 管理员或其他身份的信息 */
	info: {
		id: number
		/** 是否为超管 */
		isSuper: boolean
	}
	/** api 和菜单的权限列表 */
	permission: Permission
	/** 文件访问 key ID */
	fileRequestKeyId: number
}

/** api 和菜单权限树配置项(仅为配置, 非具体权限结果) */
export interface AuthorityTreeItem {
	id: string
	name: string
	path?: string | null
	methods?: RequestInspectorMethod | RequestInspectorMethod[] | '*' | null
	children?: AuthorityTreeItem[]
}

/** api 和菜单权限树(仅为配置, 非具体权限结果) */
export type AuthorityTree = AuthorityTreeItem[]

/** 权限配置项(仅为配置, 非具体权限结果, 结果请使用 PermissionItem) */
export interface AuthorityConfigItem {
	path: string
	methods: RequestInspectorMethod | RequestInspectorMethod[] | '*'
	meta: AuthMeta
}

/** 权限配置列表(仅为配置, 非具体权限结果, 结果请使用 Permission) */
export type AuthorityConfigList = AuthorityConfigItem[]
