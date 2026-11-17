import type { Context, Middleware, Next } from 'koa'
import { computeApiClientKeyHash, parseAndVerifyApiClientKey } from '@server/common'

/** 从请求头中取出授权密钥, 兼容 `Bearer <key>` 与直接传 `<key>` */
function getAuthorizationKey(ctx: Context) {
	const authorization = ctx.get('authorization')
	if (!authorization) return ''
	return authorization.split(' ')[1] ?? authorization
}

/**
 * 校验 openApi 授权密钥并注入客户端会话。
 *
 * 校验顺序: 密钥结构/验签 → 按密钥标识查库 → 启用状态 → 过期时间 → 密钥哈希比对。
 */
export function verifyOpenApiKey(): Middleware {
	return async (ctx: Context, next: Next) => {
		const key = getAuthorizationKey(ctx)
		if (!key) {
			ctx.body = { code: 401, msg: '缺少授权密钥' }
			return
		}

		const parsed = await parseAndVerifyApiClientKey(key)
		if (!parsed) {
			ctx.body = { code: 401, msg: '授权密钥无效' }
			return
		}

		const auth = await ctx.openApiClientStore.getAuthByKeyId({ keyId: parsed.kid })
		if (!auth || !auth.isEnabled) {
			ctx.body = { code: 401, msg: '授权密钥无效' }
			return
		}

		const expireAt = auth.expireTime ? new Date(auth.expireTime).getTime() : null
		if (expireAt !== null && expireAt <= Date.now()) {
			ctx.body = { code: 401, msg: '授权密钥已过期' }
			return
		}

		if ((await computeApiClientKeyHash(key)) !== auth.keyHash) {
			ctx.body = { code: 401, msg: '授权密钥无效' }
			return
		}

		ctx.openApiClient = { id: auth.id, name: auth.name, permissions: auth.permissions }
		await next()
	}
}
