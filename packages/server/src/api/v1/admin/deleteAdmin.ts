import { DbAdmin } from '@server/db'
import { deleteAdminParamsSchema } from './schema'
import { defineCheckError } from '@server/utils'
import { Router } from '@koa/router'

export const deleteAdminRouter = new Router()
deleteAdminRouter.post('/deleteAdmin', async (ctx) => {
	const q = deleteAdminParamsSchema.safeParse(ctx.request.body)
	if (!q.success) {
		ctx.body = defineCheckError(q.error)
		return
	}

	const admin = new DbAdmin({ ctx })
	const info = await admin.get(q.data.id)
	if (!info) {
		ctx.body = {
			code: 1,
			msg: '管理员不存在'
		}
		return
	}

	await admin.del(q.data.id)

	ctx.body = {
		code: 0,
		msg: '删除成功'
	}
})
