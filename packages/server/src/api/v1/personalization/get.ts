import type { Personalization } from './types'
import { DbAdminConfig } from '@server/db'
import { Router } from '@koa/router'

export const getRouter = new Router()
getRouter.get('/personalization/my', async (ctx) => {
	const { id } = ctx.identitySessionInfo!.info
	const info = await new DbAdminConfig({ ctx }).get(id)
	ctx.body = {
		code: 0,
		msg: '获取个性化配置成功',
		data: (info?.value ?? null) as Personalization | null
	}
})
