import './polyfills'
import '@server/config'
// import { init } from '@server/init'
import path from 'node:path'
import { createApp, getLocalIP } from 'uxiu'
import { bodyParser } from '@koa/bodyparser'
import cors from '@koa/cors'
import { styleText } from 'node:util'
import { sys } from '@server/config'
import { errorHandler, preventInjection, accessLog, notFound } from '@server/middleware'
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
		keys: sys.config.cookieKeys?.length ? sys.config.cookieKeys : void 0
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
		ctx.app.use(accessLog())
		// 内部 API 与 openApi 各自挂载自己的会话注入与鉴权中间件
		const { router } = await import('./api')
		const { openApiRouter } = await import('./openApi')
		ctx.app.use(router.routes())
		ctx.app.use(openApiRouter.routes())
		ctx.app.use(notFound())
	},
	async mounted(ctx) {
		console.log('')
		console.log(styleText('green', `后端服务启动成功 ➜  Local: http://127.0.0.1:${ctx.port}/`))
		console.log(styleText('green', `后端服务启动成功 ➜  Network: http://${primaryIP}:${ctx.port}/`))
		console.log('')
	}
})
