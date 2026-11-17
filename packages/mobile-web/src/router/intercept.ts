import type { RouteLocationNormalized } from 'vue-router'
import { persistenceKeys, project } from '@/config'

/**
 * 判断目标路径是否命中路由白名单。
 * @param path 目标路由的完整路径。
 */
function passRouteWhiteList(path: string) {
	return project.routeWhiteList.some((it) => (typeof it === 'string' ? it === path : it.test(path)))
}

/**
 * 全局路由前置守卫。
 * - 登录页始终放行, 保证未登录时可以进入登录页
 * - 开启路由白名单校验时, 命中 skipAuth 标记或路由白名单的页面可跳过鉴权
 * - 其余页面未登录时统一重定向至登录页
 */
export function beforeEach(to: RouteLocationNormalized, _from: RouteLocationNormalized) {
	const login = '/login'
	if (to.path === login) {
		return true
	}

	if (project.isCheckRouteWhiteList) {
		const skipAuth = to.matched.some((route) => route.meta.skipAuth)
		if (skipAuth || passRouteWhiteList(to.path)) {
			return true
		}
	}

	if (localStorage.getItem(persistenceKeys.token)) {
		return true
	}

	return login
}

/** 路由切换后同步页面标题 */
export function afterEach(to: RouteLocationNormalized) {
	const metaPageTitle = to.meta.pageTitle
	const pageTitle = typeof metaPageTitle === 'function' ? metaPageTitle() : metaPageTitle
	document.title = pageTitle || project.name
}
