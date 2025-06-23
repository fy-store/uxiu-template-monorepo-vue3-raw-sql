import type { InspectorType } from 'uxiu'
import { Inspector } from 'uxiu'
import { encipher } from '#common'
import type { Next, Context } from 'koa'
import { UserSession, RuleSerialize } from '#middleware'

export const verifyAuthority = () => {
	const whiteRules = Inspector.create(
		[
			{
				methods: 'POST',
				path: 'login'
			}
		],
		{ base: sys.conf.project.apiPath }
	)

	const allowRules = Inspector.create(
		[
			{
				methods: 'GET',
				path: 'getMyInfo'
			}
		],
		{ base: sys.conf.project.apiPath }
	)

	return async (ctx: Context, next: Next) => {
		const authorization = ctx.get('authorization')
			? ctx.get('authorization').split(' ')[1] ?? ctx.get('authorization')
			: ''
		const sessionId = (() => {
			try {
				return encipher.decrypted(authorization)
			} catch (error) {
				return ''
			}
		})()

		const isWhite = Inspector.check(whiteRules, ctx.method as InspectorType.Method, ctx.path)
		if (isWhite) {
			await next()
			return
		}

		if (!authorization) {
			ctx.body = {
				code: -1,
				msg: '请先登录'
			}
			return
		}

		if (!(await ctx.userSessionStore.has(sessionId))) {
			ctx.body = {
				code: -1,
				msg: '登录过期'
			}
			return
		}

		const userSession = await ctx.userSessionStore.get<UserSession>(sessionId)
		const now = Date.now()
		if (now - userSession.latelyOperationTimer > sys.conf.project.loginVerify.expireInterval) {
			ctx.body = {
				code: -1,
				msg: '长时间未操作, 请重新登录'
			}
			return
		}

		await ctx.userSessionStore.patch(sessionId, {
			latelyOperationTimer: Date.now(),
			ip: ctx.ip
		})

		if (!userSession.isSuper) {
			if (Inspector.check(allowRules, ctx.method as InspectorType.Method, ctx.path)) {
				ctx.userSession = userSession
				ctx.userSessionId = sessionId
				await next()
				return
			}

			const rules = Inspector.serializeToRules((userSession.authority ?? []) as RuleSerialize[])
			const isAdopt = Inspector.check(rules, ctx.method as InspectorType.Method, ctx.path)
			if (!isAdopt) {
				ctx.body = {
					code: 403,
					msg: '权限不足'
				}
				return
			}
		}

		ctx.userSession = userSession
		ctx.userSessionId = sessionId
		await next()
	}
}
