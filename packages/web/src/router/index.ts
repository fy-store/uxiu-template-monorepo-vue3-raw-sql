import { createRouter, createWebHistory } from 'vue-router'
import { beforeEach } from './intercept'
import Login from '../views/Login/index.vue'

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			path: '/login',
			name: 'login',
			component: Login
		},
		{
			path: '/',
			name: 'home',
			meta: {
				title: '首页'
			},
			component: () => import('../views/Home/index.vue')
		},
		{
			path: '/admin',
			meta: {
				title: '管理员管理',
				cache: true
			},
			component: () => import('../views/Admin/index.vue')
		}
	]
})

router.beforeEach(beforeEach)
export default router
