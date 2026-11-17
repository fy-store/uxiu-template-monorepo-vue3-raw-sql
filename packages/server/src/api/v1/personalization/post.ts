import { updatePersonalizationParamsSchema } from './schema'
import { DbAdminConfig } from '@server/db'
import { defineCheckError } from '@server/utils'
import { Router } from '@koa/router'

export const postRouter = new Router()
postRouter.post('/personalization/update', async (ctx) => {
	const q = updatePersonalizationParamsSchema.safeParse(ctx.request.xssBody)
	if (!q.success) {
		ctx.body = defineCheckError(q.error)
		return
	}

	const { id } = ctx.identitySessionInfo!.info
	await new DbAdminConfig({ ctx }).upsert(id, q.data)
	ctx.body = {
		code: 0,
		msg: '个性化配置已保存'
	}
})
