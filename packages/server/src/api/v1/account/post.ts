import type { IdentitySession } from '@server/config'
import { sleep, random, SessionStore, createRequestInspector } from 'uxiu'
import { hash, encipher } from '@server/common'
import { DbAdmin } from '@server/db'
import { authorityIdsToConfig } from '@server/config'
import { loginParamsSchema, updateMyPasswordParamsSchema } from './schema'
import { defineCheckError } from '@server/utils'
import { sys } from '@server/config'
import { Router } from '@koa/router'

export const postRouter = new Router()

postRouter.post('/login/admin', async (ctx) => {
	const q = loginParamsSchema.safeParse(ctx.request.xssBody)
	if (!q.success) {
		ctx.body = defineCheckError(q.error)
		return
	}

	const startTimer = Date.now()
	const admin = new DbAdmin({ ctx })
	const info = await admin.getByAccount(q.data.account, true)
	if (!info) {
		const difTimer = Date.now() - startTimer
		if (difTimer < 200) {
			await sleep(random(200, 400) - difTimer)
		}
		ctx.body = {
			code: 1,
			msg: '账号或密码有误'
		}
		return
	}

	if (!(await hash.compare(q.data.password, info.password))) {
		const difTimer = Date.now() - startTimer
		if (difTimer < 200) {
			await sleep(random(200, 400) - difTimer)
		}
		ctx.body = {
			code: 1,
			msg: '账号或密码有误'
		}
		return
	}

	const currentSessionList: [string, IdentitySession][] = []
	await ctx.identitySessionStore.each((id, value) => {
		if (value.info.id === info.id) {
			currentSessionList.push([id, value])
		}
	})

	// 当当前用户会话超过最大数量时，删除最久未操作的会话
	if (currentSessionList.length >= sys.config.loginVerify.maxSession) {
		let mostLongTimeNotOperate = currentSessionList[0]!
		for (let i = 1; i < currentSessionList.length; i++) {
			const [id, value] = currentSessionList[i]!
			if (value.latelyOperationTimer < mostLongTimeNotOperate[1].latelyOperationTimer) {
				mostLongTimeNotOperate = [id, value]
			}
		}
		await ctx.identitySessionStore.delete(mostLongTimeNotOperate[0])
	}

	// 按权限 id 依据当前权限配置重新序列化, 避免权限路径变更后存量权限失效
	const inspector = await createRequestInspector()
	const permission = inspector.rulesToSerialize(
		inspector.create(authorityIdsToConfig(info.authority.map((it) => it.meta!.id)), { base: sys.config.apiPath })
	)

	const id = new SessionStore().createSessionId()
	const sessionId = await ctx.identitySessionStore.customCreate(id, {
		id,
		ip: ctx.ip,
		latelyOperationTimer: Date.now(),
		info: {
			id: info.id,
			type: 'admin',
			isSuper: info.isSuper
		},
		permission
	})

	ctx.body = {
		code: 0,
		msg: '登录成功',
		data: {
			name: info.name,
			token: await encipher.encryption(sessionId)
		}
	}
})

postRouter.post('/logout', async (ctx) => {
	await ctx.identitySessionStore.delete(ctx.identitySessionId!)
	ctx.body = {
		code: 0,
		msg: '退出登录成功'
	}
})

postRouter.post('/updateMyPassword', async (ctx) => {
	const q = updateMyPasswordParamsSchema.safeParse(ctx.request.xssBody)
	if (!q.success) {
		ctx.body = defineCheckError(q.error)
		return
	}

	const { id } = ctx.identitySessionInfo!.info

	const info = await new DbAdmin({ ctx }).get(id, true)
	if (!info) {
		ctx.body = {
			code: 1,
			msg: '账号不存在'
		}
		return
	}
	const password = info.password

	if (!(await hash.compare(q.data.oldPassword, password))) {
		ctx.body = {
			code: 1,
			msg: '原密码有误'
		}
		return
	}

	const newPassword = await hash.encode(q.data.newPassword)
	await new DbAdmin({ ctx }).update({ id, password: newPassword })

	ctx.body = {
		code: 0,
		msg: '密码修改成功'
	}
})
