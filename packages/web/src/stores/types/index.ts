import type { RouteLocationNormalizedLoadedGeneric } from 'vue-router'

export type UserInfo = {
	/** 用户名 */
	name: string
}

export type HistoryItem = {
	/** 标题 */
	title: string
	/** 路径 */
	path: string
	/** 路由 */
	route: RouteLocationNormalizedLoadedGeneric
	/** 组件名称, 用于缓存 */
	// name?: string
	/** 当前是否为激活项 */
	active: boolean
}

export type PushHistoryItem = {
	/** 标题 */
	title: string
	/** 路径 */
	path: string
	/** 路由 */
	route: RouteLocationNormalizedLoadedGeneric
	/** 组件名称, 用于缓存 */
	// name?: string
}

export type UseAppCommunicateState = {
	/** 侧边栏是否收缩 */
	isSidebarIsCollapse: boolean
}
