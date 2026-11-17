import { createRouter, createWebHistory } from 'vue-router'
import { beforeEach } from './intercept'
import Login from '@/views/Login/index.vue'

export const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			path: '/',
			name: 'home',
			meta: {
				title: '首页',
				cache: true,
				// 固定在 nav 中, 始终存在且不可关闭
				fixed: true,
				pageTitle: '首页',
				// 根路径默认生成的缓存名为空, KeepAlive 不会缓存, 这里显式指定一个非空组件名
				generateName: () => '/home'
			},
			component: () => import('@/views/Home/index.vue')
		},
		{
			path: '/admin',
			name: 'admin',
			meta: {
				title: '管理员管理',
				cache: true
			},
			component: () => import('@/views/Admin/index.vue')
		},
		{
			path: '/settings',
			name: 'settings',
			meta: {
				title: '个性化设置',
				cache: true
			},
			component: () => import('@/views/Settings/index.vue')
		},
		{
			path: '/login',
			name: 'login',
			meta: {
				title: '登录'
			},
			component: Login
		},
		{
			path: '/404',
			name: 'notFound',
			meta: {
				title: '页面不存在'
			},
			component: () => import('@/views/404/index.vue')
		},
		{
			path: '/:pathMatch(.*)*',
			redirect: (to) => ({
				path: '/404',
				query: {
					from: to.fullPath
				}
			})
		}
	]
})

router.beforeEach(beforeEach)
export default router
