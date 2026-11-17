import type { RouteLocationNormalized } from 'vue-router'
import { persistenceKeys, project } from '@/config'

export function beforeEach(to: RouteLocationNormalized, _from: RouteLocationNormalized) {
	if (
		project.whileRoutes.some((route) => {
			if (route instanceof RegExp) {
				return route.test(to.path)
			}
			return route === to.path
		})
	) {
		return true
	}

	if (localStorage.getItem(persistenceKeys.TOKEN)) {
		return true
	}

	return project.loginPath
}
