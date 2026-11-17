export interface Layout {
	/** 顶部导航栏 */
	header: {
		/** 高度 */
		height: string
		/** 背景颜色 */
		backgroundColor: string
		/** 颜色 */
		color: string
	}
	/** 底部标签栏 */
	tabbar: {
		/** 高度 */
		height: string
	}
}

export interface SidebarListItem {
	/** 点击后跳转地址, 若开启缓存且未声明 name 将自动通过 path 生成缓存名标识 */
	path?: string
	/** 组件名称, 若声明将作为缓存名标识 */
	name?: string
	/** 标题 */
	title: string
	/** 标题行间样式 */
	titleStyle?: Record<string, any>
	/** 图标, 使用 Varlet 内置图标名, 参考 https://varletjs.org/#/icon */
	icon?: string
	/** 是否不受权限过滤影响, 始终展示 */
	alwaysShow?: boolean
	/** 子节点 */
	children?: SidebarListItem[]
}

export interface SideBar {
	/** 标签栏列表 */
	list: SidebarListItem[]
}

export interface Project {
	/** 项目名称 */
	name: string
	/** 项目描述 */
	description?: string
	/** 侧边栏 */
	sidebar: SideBar
	/** API 地址 */
	apiURL: string
	/**
	 * **是否开启路由白名单校验**
	 * - 开启后, 命中路由 *skipAuth* 标记或路由白名单的页面将跳过鉴权
	 * - 关闭后, 仅登录页可跳过鉴权
	 */
	isCheckRouteWhiteList: boolean
	/**
	 * **路由白名单**
	 * - 支持完整路径字符串(如 `'/login'`)与正则(如 `/^\/share\//`), 命中后跳过鉴权
	 */
	routeWhiteList: (string | RegExp)[]
}
