import { Router } from '@koa/router'
import {
	createApiClientParamsSchema,
	deleteApiClientParamsSchema,
	resetApiClientKeyParamsSchema,
	updateApiClientParamsSchema
} from './schema'
import { defineCheckError } from '@server/utils'
import { DbApiClient } from '@server/db'
import { createApiClientKey } from '@server/common'

export const postRouter = new Router()

postRouter.post('/createApiClient', async (ctx) => {
	const q = createApiClientParamsSchema.safeParse(ctx.request.body)
	if (!q.success) {
		ctx.body = defineCheckError(q.error)
		return
	}

	const { key, keyId, keyHash } = await createApiClientKey()
	const dbApiClient = new DbApiClient({ ctx })
	const result = await dbApiClient.create({ ...q.data, keyId, keyHash })

	ctx.body = {
		code: 0,
		msg: '创建 API 客户端成功',
		// 密钥仅在此次响应中返回, 之后无法再次查看
		data: { id: result.insertId, key }
	}
})

postRouter.post('/deleteApiClient', async (ctx) => {
	const q = deleteApiClientParamsSchema.safeParse(ctx.request.body)
	if (!q.success) {
		ctx.body = defineCheckError(q.error)
		return
	}

	const dbApiClient = new DbApiClient({ ctx })
	if (!(await dbApiClient.get({ id: q.data.id }))) {
		ctx.body = {
			code: 1,
			msg: 'API 客户端不存在'
		}
		return
	}
	await dbApiClient.del(q.data.id)

	ctx.body = {
		code: 0,
		msg: '删除 API 客户端成功',
		data: { id: q.data.id }
	}
})

postRouter.post('/updateApiClient', async (ctx) => {
	const q = updateApiClientParamsSchema.safeParse(ctx.request.body)
	if (!q.success) {
		ctx.body = defineCheckError(q.error)
		return
	}

	const dbApiClient = new DbApiClient({ ctx })
	if (!(await dbApiClient.get({ id: q.data.id }))) {
		ctx.body = {
			code: 1,
			msg: 'API 客户端不存在'
		}
		return
	}
	await dbApiClient.update(q.data)

	ctx.body = {
		code: 0,
		msg: '修改 API 客户端成功',
		data: { id: q.data.id }
	}
})

postRouter.post('/resetApiClientKey', async (ctx) => {
	const q = resetApiClientKeyParamsSchema.safeParse(ctx.request.body)
	if (!q.success) {
		ctx.body = defineCheckError(q.error)
		return
	}

	const dbApiClient = new DbApiClient({ ctx })
	if (!(await dbApiClient.get({ id: q.data.id }))) {
		ctx.body = {
			code: 1,
			msg: 'API 客户端不存在'
		}
		return
	}

	// 轮换密钥标识与哈希, 旧密钥立即失效
	const { key, keyId, keyHash } = await createApiClientKey()
	await dbApiClient.resetKey({ id: q.data.id, keyId, keyHash })

	ctx.body = {
		code: 0,
		msg: '重置密钥成功',
		data: { key }
	}
})
