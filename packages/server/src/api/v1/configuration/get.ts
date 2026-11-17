import { Router } from '@koa/router'

export const getRouter = new Router()
getRouter.get('/common', async (ctx) => {
	ctx.body = {
		code: 0,
		msg: '获取公共配置成功',
		data: {}
	}
})
