import type { RequestInspectorMethod } from 'uxiu'
import type { Next, Context } from 'koa'
import { createRequestInspector } from 'uxiu'
import { encipher } from '@server/common'
import { whiteRoutes, allowRoutes } from '@server/config'
import { sys } from '@server/config'

/**
 * 校验身份, 通过则注入身份会话
 */
export function verifyIdentityPermission() {
	return async (ctx: Context, next: Next) => {
		const inspector = await createRequestInspector()
		const whiteRules = inspector.create(whiteRoutes, { base: sys.config.apiPath })
		const allowRules = inspector.create(allowRoutes, { base: sys.config.apiPath })
		const method = ctx.method as RequestInspectorMethod
		const path = ctx.path
		const isWhite = inspector.check(whiteRules, method, path)
		if (isWhite) {
			await next()
			return
		}

		const authorization = ctx.get('authorization')
			? (ctx.get('authorization').split(' ')[1] ?? ctx.get('authorization'))
			: ''

		if (!authorization) {
			ctx.body = {
				code: -1,
				msg: '请先登录'
			}
			return
		}

		let sessionId = ''
		try {
			sessionId = await encipher.decrypted(authorization)
		} catch {
			ctx.body = {
				code: -1,
				msg: '登录过期'
			}
			return
		}

		if (!(await ctx.identitySessionStore.has(sessionId))) {
			ctx.body = {
				code: -1,
				msg: '登录过期'
			}
			return
		}

		const session = await ctx.identitySessionStore.get(sessionId)
		const now = Date.now()
		if (now - session.latelyOperationTimer > sys.config.loginVerify.expireInterval) {
			ctx.body = {
				code: -1,
				msg: '长时间未操作, 请重新登录'
			}
			return
		}

		// 异步更新
		ctx.identitySessionStore.patch(sessionId, {
			latelyOperationTimer: Date.now(),
			ip: ctx.ip
		})

		if (!session.info.isSuper) {
			if (inspector.check(allowRules, method, path)) {
				ctx.identitySessionInfo = session
				ctx.identitySessionId = sessionId
				await next()
				return
			}
			const rules = inspector.serializeToRules(session.permission ?? [])
			const isAdopt = inspector.check(rules, method, path)
			if (!isAdopt) {
				ctx.body = {
					code: 403,
					msg: '权限不足'
				}
				return
			}
		}

		ctx.identitySessionInfo = session
		ctx.identitySessionId = sessionId
		await next()
	}
}
