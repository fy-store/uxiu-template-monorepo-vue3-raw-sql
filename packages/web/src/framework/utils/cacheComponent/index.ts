import { defineComponent, h, shallowReactive, type Component } from 'vue'
import type { RouteLocationNormalizedLoadedGeneric } from 'vue-router'

export class CacheComponent {
	readonly cache = shallowReactive(new Map<string, Component>())

	/**
	 * 一个用于根据路由记录动态生成并缓存组件的工具类。
	 * - 通过路由 meta.cache 决定是否缓存组件
	 * - 通过路由 meta.generateName 定义缓存组件的名称
	 * - 需要配合 `packages/web/src/framework/components/MultiLevelKeepAlive` 组件使用，以实现多层级路由的组件缓存功能
	 */
	constructor() {}

	/**
	 * 根据当前路由层级决定是否包装并缓存组件。
	 * - 命中缓存时直接返回已缓存组件
	 * - 未开启缓存时仅在存在 generateName 时包装命名组件
	 * - 开启缓存时创建命名包装组件并写入缓存
	 * @param route 当前激活路由
	 * @param component router-view 暴露的组件
	 * @param index 指定匹配层级，未传时默认取最后一层 matched
	 */
	getComponent(route: RouteLocationNormalizedLoadedGeneric, component: Component, index?: number) {
		if (!component) return component
		const currentMatched = this._getMatchedRoute(route, index)
		const name = this._generateName(route, component, index)
		if (this.cache.has(name)) {
			return this.cache.get(name)
		}
		if (!currentMatched?.meta?.cache) {
			if (currentMatched?.meta?.generateName) {
				return defineComponent({
					name,
					render() {
						return h(component)
					}
				})
			}
			return component
		}

		const newComponent = defineComponent({
			name,
			render() {
				return h(component)
			}
		})
		this.cache.set(name, newComponent)
		return newComponent
	}

	/**
	 * 通过路由 path 生成缓存组件 name
	 * - 该方法提供用于缓存相关模块统一的命名生成逻辑
	 * @param routePath 路由 path
	 */
	getName(routePath: string) {
		return routePath.slice(1).replaceAll('/', '-')
	}

	/**
	 * 按指定路由层级生成默认缓存名。
	 * @param route 当前激活路由
	 * @param index 指定匹配层级
	 * @returns 形如 books-classify1 的组件名；若无匹配项则返回空字符串
	 */
	private _getName(route: RouteLocationNormalizedLoadedGeneric, index?: number) {
		const matched = this._getMatchedRoute(route, index)
		if (!matched) {
			return ''
		}
		return this.getName(matched.path).trim()
	}

	/**
	 * 生成组件 name：优先使用路由 meta.generateName，否则回退到默认名称。
	 * @param route 当前激活路由
	 * @param component 当前渲染组件
	 * @param index 指定匹配层级
	 */
	private _generateName(route: RouteLocationNormalizedLoadedGeneric, component: Component, index?: number) {
		const currentMatched = this._getMatchedRoute(route, index)
		if (typeof currentMatched?.meta?.generateName === 'function') {
			return this.getName(currentMatched.meta.generateName({ component }))
		} else if (currentMatched?.meta?.generateName) {
			return this.getName(currentMatched.meta.generateName)
		}
		return this._getName(route, index)
	}

	/**
	 * 获取当前应使用的 matched 路由记录。
	 * @param route 当前激活路由
	 * @param index 指定层级（从 0 开始）
	 * @returns 指定层级 matched；未传 index 时返回最后一层 matched
	 */
	private _getMatchedRoute(route: RouteLocationNormalizedLoadedGeneric, index?: number) {
		if (typeof index === 'number' && index >= 0) {
			return route.matched[index]
		}
		return route.matched.at(-1)
	}
}
