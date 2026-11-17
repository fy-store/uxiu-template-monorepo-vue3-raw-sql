import 'vue-router'
import type { Component } from 'vue'

declare module 'vue-router' {
	interface RouteMeta {
		/**
		 * **页面标题**
		 * - 若未设置, 将使用系统名称
		 */
		pageTitle?: string | (() => string)
		/**
		 * **是否缓存**
		 * - 若为 true, 在路由切换时将自动产生一个包装组件, 包装组件将按照路由的 *path* 生成组件 name,
		 * 组件名生成可通过 *generateName()* 进行自定义
		 * - 若为 false, 将不进行包装
		 */
		cache?: boolean
		/**
		 * **自定义生成包装组件 name**
		 * @param ctx 上下文对象
		 * @returns 需要符合 vue 组件 name 规则(不能出现 **\/** )
		 */
		generateName?: string | ((ctx: GenerateNameCtx) => string)
		/**
		 * **是否跳过鉴权**
		 * - 仅在开启路由白名单校验时有效 (见 `@/config` 中的 *isCheckRouteWhiteList*)
		 */
		skipAuth?: boolean
		/**
		 * **是否为导航栏页面**
		 * - 若为 true , 底部将展示导航栏组件, 默认为 false
		 * - 多级路由只需在其父级路由中设置即可
		 */
		isTabBar?: boolean
		/**
		 * **是否开启页面切换动画**
		 * - 切换页面时将展示过渡动画, 默认为 true
		 * - 1. 非 tabbar 进入 tabbar 页面规则为: 当是已经缓存过的页面时要改成从左边进来
		 * - 2. 非 tabbar 进入非 tabbar 页面规则为: 当是已经缓存过的页面时要改成从左边进来
		 * - 3. tabbar 页面进入非 tabbar 页面时规则为: 当是已经缓存过的页面时要改成从左边进来
		 * - 4. tabbar 页面进入 tabbar 页面时规则为: 进入的 tabbar 页面下标大于当前 tabbar 页面的下标从右边进, 进入的 tabbar 页面下标小于当前 tabbar 页面的下标从左边进来
		 */
		isTransition?: boolean
		[key: string]: any
	}
}

export interface GenerateNameCtx {
	component: Component
}
