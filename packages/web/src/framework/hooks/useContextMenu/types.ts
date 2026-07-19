export interface MenuItem {
	name: string
	value?: string | number
	icon?: string
	disabled?: boolean
	divided?: boolean
	hidden?: boolean
	/**
	 * 菜单项点击回调。
	 * @param item 当前菜单项。
	 * @param context 打开菜单时传入的上下文。
	 */
	onClick?: (item: MenuItem, context?: any) => void
}

export interface OpenOptions {
	items?: MenuItem[]
	context?: any
}

export interface Options {
	items?: MenuItem[]
	customClass?: string
	zIndex?: number
	minWidth?: number | string
	offset?: number
	closeOnClick?: boolean
	closeOnScroll?: boolean
	closeOnResize?: boolean
	teleport?: boolean
	autoMount?: boolean
}

type RequiredKeys =
	| 'items'
	| 'customClass'
	| 'zIndex'
	| 'minWidth'
	| 'offset'
	| 'closeOnClick'
	| 'closeOnScroll'
	| 'closeOnResize'
	| 'teleport'
	| 'autoMount'

export type Config = Omit<Options, RequiredKeys> & Required<Pick<Options, RequiredKeys>>

export interface Position {
	x: number
	y: number
}

export interface EventTypes {
	/**
	 * 菜单打开时触发。
	 * @param payload 打开位置、菜单项和业务上下文。
	 */
	open?: (payload: { position: Position; items: MenuItem[]; context?: any }) => void
	/** 菜单关闭时触发。 */
	close?: () => void
	/**
	 * 菜单项被选择时触发。
	 * @param item 被选择的菜单项。
	 * @param context 打开菜单时传入的上下文。
	 */
	select?: (item: MenuItem, context?: any) => void
}

export interface TemplateProps {
	visible: boolean
	x: number
	y: number
	items: MenuItem[]
	context?: any
	customClass?: string
	zIndex?: number
	minWidth?: number | string
	teleport?: boolean
}
