import type { IdentitySession } from '@server/config'
import { SessionStore } from 'uxiu'
import { encipher } from '@server/common'
import { DbAdmin } from '@server/db'
import { sys } from '@server/config'
import { Router } from '@koa/router'

export const getTokenRouter = new Router()
if (process.env.NODE_ENV === 'development') {
	getTokenRouter.get('/debug/getToken', async (ctx) => {
		if (process.env.NODE_ENV !== 'development') {
			ctx.status = 403
			ctx.body = {
				code: 403,
				msg: '非开发环境, 不能使用该接口'
			}
			return
		}

		const admin = new DbAdmin({ ctx })
		const info = await admin.getByAccount(sys.config.init.root.account, true)
		if (!info) {
			ctx.body = {
				code: 1,
				msg: '初始管理员账号未创建, 请通知用户先执行: `pnpm init:root` 命令'
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

		const id = new SessionStore().createSessionId()
		const sessionId = await ctx.identitySessionStore.customCreate(id, {
			id,
			ip: ctx.ip,
			latelyOperationTimer: Date.now(),
			info: {
				id: info.id,
				isSuper: info.isSuper
			},
			permission: info.authority
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
}
