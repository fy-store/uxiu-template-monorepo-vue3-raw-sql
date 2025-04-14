import 'vue-router'
import type { Component } from 'vue'
import type { Router, RouteLocationNormalizedLoadedGeneric } from 'vue-router'

declare module 'vue-router' {
	interface RouteMeta {
		/**
		 * **路由描述名称**
		 * - 该名称将作为 [路由历史(面包屑)] 的标签名
		 * - 默认值为路由 *path*
		 */
		title?: string | ((ctx: GenerateTitleCtx) => string)
		/**
		 * **页面标题**
		 * - 若未设置, 将按以下顺序获取
		 * 1. 路由描述名称, 若未设置继续往下查找, 若存在则名称为: 系统名称 - 路由描述名称
		 * 2. 系统名称
		 */
		pageTitle?: string | ((ctx: GeneratePageNameCtx) => string)
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
		[key: string]: any
	}
}

export interface GenerateNameCtx {
	router: Router
	route: RouteLocationNormalizedLoadedGeneric
	component: Component
}

export interface GeneratePageNameCtx {
	router: Router
	route: RouteLocationNormalizedLoadedGeneric
}

export interface GenerateTitleCtx {
	router: Router
	route: RouteLocationNormalizedLoadedGeneric
}
