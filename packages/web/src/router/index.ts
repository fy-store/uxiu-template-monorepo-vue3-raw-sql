import { createRouter, createWebHistory } from 'vue-router'
import { beforeEach } from './intercept'
import Login from '@/views/Login/index.vue'
import Home from '@/views/Home/index.vue'

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			// 演示使用缓存, 实际项目中请移除
			path: '/books',
			meta: {
				cache: true
			},
			component: () => import('@/views/Books/index.vue'),
			children: [
				{
					path: 'classify1',
					meta: {
						cache: true
					},
					component: () => import('@/views/Books/Classify1/index.vue'),
					children: [
						{
							path: 'book1',
							meta: {
								cache: true
							},
							component: () => import('@/views/Books/Classify1/Book1/index.vue'),
							children: [
								{
									path: 'page1',
									component: () => import('@/views/Books/Classify1/Book1/Page1/index.vue')
								}
							]
						},
						{
							path: 'book2',
							component: () => import('@/views/Books/Classify1/Book2/index.vue')
						}
					]
				},
				{
					path: 'classify2',
					component: () => import('@/views/Books/Classify2/index.vue'),
					children: [
						{
							path: 'book1',
							component: () => import('@/views/Books/Classify2/Book1/index.vue')
						},
						{
							path: 'book2',
							component: () => import('@/views/Books/Classify2/Book2/index.vue')
						}
					]
				}
			]
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
			path: '/test',
			meta: {
				title: '测试页面',
				cache: true
			},
			component: () => import('@/views/Test/index.vue')
		},
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
			component: Home
		},
		{
			path: '/admin',
			meta: {
				title: '管理员管理',
				cache: true
			},
			component: () => import('@/views/Admin/index.vue')
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
