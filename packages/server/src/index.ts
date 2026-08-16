import './polyfills'
import '@server/config'
import {} from '@server/init'
import path from 'node:path'
import { createApp, getLocalIP } from 'uxiu'
import { bodyParser } from '@koa/bodyparser'
import cors from '@koa/cors'
import { styleText } from 'node:util'
import { sys } from '@server/config'
import { fileStorage } from '@server/common'
import {
	errorHandler,
	preventInjection,
	accessLog,
	staticFile,
	notFound,
	identitySession,
	verifyIdentityPermission
} from '@server/middleware'
export type * from '@server/api/index'

const primaryIP = getLocalIP.getPrimaryLocalIP()
createApp({
	port: sys.config.port,
	env: process.env.NODE_ENV,
	loggerOptions: {
		storageDirPath: path.join(process.cwd(), sys.config.common.logger.storagePath),
		categories: { db: true }
	},
	koaOptions: {
		proxy: true,
		keys: sys.config.cookieKeys
	},
	async beforeMount(ctx) {
		ctx.app.use(bodyParser())
		ctx.app.use(errorHandler())
		ctx.app.use(preventInjection())
		ctx.app.use(
			cors({
				credentials: true,
				origin(koaCtx) {
					const allowed = [
						`http://localhost`,
						`http://127.0.0.1`,
						`http://${primaryIP}`,
						sys.config.domain,
						`${sys.config.domain}:${sys.config.port}`
					]
					if (process.env.NODE_ENV === 'development' || allowed.some((it) => koaCtx.origin?.includes(it))) {
						return koaCtx.origin
					}
					return ''
				}
			})
		)
		// 处理本地服务器存储公共目录请求(如果使用 nginx 直接代理的前端资源，则无需此配置, 可直接删除该配置)
		ctx.app.use(
			staticFile({
				publicPath: fileStorage.pathJoin(sys.config.common.fileStorage.storagePath, 'public'),
				startPath: '/storage/public'
			})
		)
		// 处理放置前端文件请求(如果使用 nginx 直接代理的前端资源，则无需此配置, 可直接删除该配置)
		ctx.app.use(
			staticFile({
				publicPath: '/public',
				startPath: '/',
				isHandle(ctx) {
					if (ctx.path.startsWith(sys.config.apiPath)) {
						return false
					}
					return true
				},
				redirect(ctx, filePath) {
					if (ctx.method.toUpperCase() !== 'GET') {
						return filePath
					}

					// 明确存在文件扩展名，认为是静态资源
					if (ctx.path.includes('.')) {
						return filePath
					}

					const accept = ctx.get('accept')
					const fetchDest = ctx.get('sec-fetch-dest')
					const fetchMode = ctx.get('sec-fetch-mode')

					// Accept 不接受 HTML，不进行 SPA fallback
					if (accept && !accept.includes('text/html')) {
						return filePath
					}

					// Sec-Fetch-Dest 存在时，必须是 document
					if (fetchDest && fetchDest !== 'document') {
						return filePath
					}

					// 浏览器页面导航通常为 navigate
					if (fetchMode && fetchMode !== 'navigate') {
						return filePath
					}

					return '/public/index.html'
				}
			})
		)
		ctx.app.use(accessLog())
		ctx.app.use(identitySession())
		ctx.app.use(verifyIdentityPermission())
		const { router } = await import('./api')
		ctx.app.use(router.routes())
		ctx.app.use(notFound())
	},
	async mounted(ctx) {
		console.log('')
		console.log(styleText('green', `后端服务启动成功 ➜  Local: http://127.0.0.1:${ctx.port}/`))
		console.log(styleText('green', `后端服务启动成功 ➜  Network: http://${primaryIP}:${ctx.port}/`))
		console.log('')
	}
})
