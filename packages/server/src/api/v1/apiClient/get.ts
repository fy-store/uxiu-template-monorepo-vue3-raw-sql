import { Router } from '@koa/router'
import { getApiClientListParamsSchema } from './schema'
import { defineCheckError } from '@server/utils'
import { DbApiClient } from '@server/db'

export const getRouter = new Router()
getRouter.get('/apiClientList', async (ctx) => {
	const q = getApiClientListParamsSchema.safeParse(ctx.query)
	if (!q.success) {
		ctx.body = defineCheckError(q.error)
		return
	}

	const dbApiClient = new DbApiClient({ ctx })
	const list = await dbApiClient.getList(q.data)
	const { count } = await dbApiClient.getCount({ name: q.data.name })

	ctx.body = {
		code: 0,
		msg: '获取 API 客户端列表成功',
		data: { list, count }
	}
})
