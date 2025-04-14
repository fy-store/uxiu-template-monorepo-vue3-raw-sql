import type { Component } from 'vue'

export type Layout = {
	/** 顶部导航栏 */
	header: {
		/** 高度 */
		height: string
		/** 背景颜色 */
		backgroundColor: string
		/** 颜色 */
		color: string
	}
	/** 侧边栏 */
	sidebar: {
		/** 宽带 */
		width: string
	}
	/** 主体 */
	main: {
		/** 背景颜色 */
		backgroundColor: string
	}
}

export type IconConf = {
	/** 组件 */
	component: Component
	/** 组件属性 */
	prop?: Record<string, any>
	/** 组件行间样式 */
	style?: Record<string, any>
}

export type SidebarListItem = {
	/** 点击后跳转地址, 且若未声明 name 将自动通过 path 生成缓存名标识 */
	path?: string
	/** 组件名称, 若声明将作为缓存名标识 */
	name?: string
	/** 标题 */
	title: string
	/** 标题行间样式 */
	titleStyle?: Record<string, any>
	/** 图标 */
	icon?: Component | IconConf
	/** 子节点 */
	children?: SidebarListItem[]
}

export type SideBar = {
	/** 默认图标属性 */
	defaultIconProp?: Record<string, any>
	/** 默认图标行间样式 */
	defaultIconStyle?: Record<string, any>
	/** 默认标题行间样式 */
	defaultTitleStyle?: Record<string, any>
	/** 菜单列表 */
	list: SidebarListItem[]
}

export type Project = {
	/** 项目名称 */
	name: string
	/** 侧边栏 */
	sidebar: SideBar
}
