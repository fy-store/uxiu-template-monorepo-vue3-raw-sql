import type { RouteLocationNormalized } from 'vue-router'
import { persistenceKeys } from '@/config'

export const whileRoute = ['/login', '/404']
export const beforeEach = (to: RouteLocationNormalized, _from: RouteLocationNormalized) => {
	if (whileRoute.includes(to.path)) {
		return true
	}

	if (localStorage.getItem(persistenceKeys.token)) {
		return true
	}

	return '/login'
}
