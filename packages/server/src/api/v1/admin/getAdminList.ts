import { DbAdmin } from '@server/db'
import { getAdminListParamsSchema } from './schema'
import { defineCheckError } from '@server/utils'
import { Router } from '@koa/router'

export const getAdminListRouter = new Router()
getAdminListRouter.get('/getAdminList', async (ctx) => {
	const q = getAdminListParamsSchema.safeParse(ctx.query)
	if (!q.success) {
		ctx.body = defineCheckError(q.error)
		return
	}

	const admin = new DbAdmin({ ctx })
	const list = await admin.getList(q.data, ctx.identitySessionInfo?.info.isSuper)
	const { count } = await admin.getCount(q.data)

	ctx.body = {
		code: 0,
		msg: '获取管理员列表成功',
		data: {
			count,
			list: list.map((it) => {
				return {
					...it,
					authority: it.authority.map((it) => it.meta!.id)
				}
			})
		}
	}
})
