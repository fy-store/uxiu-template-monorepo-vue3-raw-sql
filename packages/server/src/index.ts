import './polyfills.js'
import './global/index.js'
import '#db'
import { createApp } from 'uxiu'
import { bodyParser } from '@koa/bodyparser'
import { logger } from '#common'
import cors from '@koa/cors'
import color from 'picocolors'
import { preventInjection, userSession, verifyAuthority, visitLog, reqLog } from '#middleware'
import { Context } from 'koa'

createApp({
	port: $.sysConf.project.port,
	koaOptions: {
		proxy: true
	},
	async beforeMount(ctx) {
		ctx.app.on('error', routerError)
		ctx.app.use(visitLog())
		ctx.app.use(cors())
		ctx.app.use(bodyParser())
		ctx.app.use(userSession())
		ctx.app.use(verifyAuthority())
		ctx.app.use(preventInjection())
		ctx.app.use(reqLog())
		const router = await import('./router/index.js')
		ctx.app.use(router.default.routes())
	},
	mounted(ctx) {
		console.log('')
		console.log(color.green(`服务启动成功 ➜  http://127.0.0.1:${ctx.port}/`), '\n')
	}
})

function routerError(err: Error, ctx: Context) {
	const info = {
		ip: ctx.ip,
		method: ctx.method,
		url: ctx.url,
		query: ctx.query,
		params: ctx.params,
		body: ctx.request.body,
		authorization: ctx.header.authorization,
		userSessionId: ctx.userSessionId,
		userSession: ctx.userSession
	}

	const text = `\
	\n    上下文:\
	\n    ${JSON.stringify(info, null, 8).slice(0, -1) + '    }'}\
	\n    错误类型: ${err.name}\
	\n    错误信息: ${err.message}\
	\n    错误堆栈: ${err.stack}\
	`
	logger.send.error('路由错误', err, '\n')
	logger.reqError.error(text)
}
