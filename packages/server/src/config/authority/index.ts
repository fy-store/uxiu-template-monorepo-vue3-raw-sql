import type { AuthorityConfigItem, AuthorityTree } from './types'
import { readonly } from 'uxiu'
import { authorityTreeToConfigList, checkAuthorityTreeRepeat } from './utils'
export * from './utils'
export type * from './types'

/** 权限树 */
export const authorityTree = readonly<AuthorityTree>([
	{
		id: 'v1:books',
		name: '书库',
		children: [
			{
				id: 'books',
				name: '书库',
				methods: null,
				path: null
			}
		]
	},
	{
		id: 'v1:admin',
		name: '管理员',
		children: [
			{
				id: 'admin',
				name: '管理员管理菜单',
				methods: null,
				path: null
			},
			{
				id: 'v1:admin:create',
				name: '添加管理员',
				methods: 'POST',
				path: 'v1/createAdmin'
			},
			{
				id: 'v1:admin:delete',
				name: '删除管理员',
				methods: 'POST',
				path: 'v1/deleteAdmin'
			},
			{
				id: 'v1:admin:update',
				name: '修改管理员',
				methods: 'POST',
				path: 'v1/updateAdmin'
			},
			{
				id: 'v1:admin:getList',
				name: '获取管理员列表',
				methods: 'GET',
				path: 'v1/getAdminList'
			}
		]
	},
	{
		id: 'v1:authority',
		name: '权限',
		children: [
			{
				id: 'v1:authority:getList',
				name: '获取权限选择器',
				methods: 'GET',
				path: 'v1/getAuthoritySelect'
			}
		]
	}
])
/** 验证是否存在重复的 id 或 path */
checkAuthorityTreeRepeat(authorityTree)

/** 白名单路由 */
export const whiteRoutes: Omit<AuthorityConfigItem, 'meta'>[] = readonly([
	{
		methods: 'POST',
		path: 'v1/login/admin'
	},
	{
		methods: 'GET',
		path: 'v1/debug/getToken'
	}
])

/** 登录后不限权限的路由 */
export const allowRoutes: Omit<AuthorityConfigItem, 'meta'>[] = readonly([
	{
		methods: 'GET',
		path: 'v1/getMyInfo'
	}
])

/** 权限配置列表 */
export const authorityConfigList = readonly(authorityTreeToConfigList(authorityTree))
