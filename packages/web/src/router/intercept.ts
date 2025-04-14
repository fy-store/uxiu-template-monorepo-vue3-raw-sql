import type { RouteLocationNormalized } from 'vue-router'

export const whileRoute = ['/login']
export const beforeEach = (to: RouteLocationNormalized, _from: RouteLocationNormalized) => {
	if (whileRoute.includes(to.path)) {
		return true
	}

	if (localStorage.getItem('token')) {
		return true
	}

	return '/login'
}
