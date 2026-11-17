import { createRouter, createWebHistory } from 'vue-router'
import { beforeEach, afterEach } from './intercept'
import Login from '@/views/Login/index.vue'

export const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		// #region 业务路由
		{
			path: '/',
			redirect: '/mine'
		},
		{
			path: '/login',
			name: 'login',
			component: Login
		},
		{
			path: '/admin',
			meta: {
				cache: true,
				isTabBar: true
			},
			component: () => import('@/views/Admin/index.vue')
		},
		{
			path: '/mine',
			name: 'mine',
			meta: {
				isTabBar: true
			},
			component: () => import('@/views/Mine/index.vue')
		},
		// #endregion

		// #region 默认配置
		{
			path: '/404',
			name: 'notFound',
			meta: {
				skipAuth: true
			},
			component: () => import('@/views/404/index.vue')
		},
		{
			path: '/:pathMatch(.*)*',
			meta: {
				skipAuth: true
			},
			redirect: (to) => ({
				path: '/404',
				query: {
					from: to.fullPath
				}
			})
		}
		// #endregion
	]
})

router.beforeEach(beforeEach)
router.afterEach(afterEach)
export default router
