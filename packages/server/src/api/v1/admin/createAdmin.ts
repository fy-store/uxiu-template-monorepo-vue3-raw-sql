import type { IdentitySession, Permission } from '@server/config'
import type { AuthMeta, AuthorityConfigList } from '@server/config'
import { createRequestInspector } from 'uxiu'
import { hash } from '@server/common'
import { DbAdmin } from '@server/db'
import { authorityConfigList } from '@server/config'
import { createAdminParamsSchema } from './schema'
import { defineCheckError } from '@server/utils'
import { sys } from '@server/config'
import { Router } from '@koa/router'

export const createAdminRouter = new Router()
createAdminRouter.post('/createAdmin', async (ctx) => {
	const inspector = await createRequestInspector()
	const q = createAdminParamsSchema.safeParse(ctx.request.body)
	if (!q.success) {
		ctx.body = defineCheckError(q.error)
		return
	}

	const admin = new DbAdmin({ ctx })
	const info = await admin.getByAccount(q.data.account)
	if (info) {
		ctx.body = {
			code: 1,
			msg: '账号已存在'
		}
		return
	}

	const isSuper = ctx.identitySessionInfo!.info.isSuper && q.data.isSuper === true
	await admin.create({
		account: q.data.account,
		password: await hash.encode(q.data.password),
		authority: filterAuthority(inspector, q.data.authority, ctx.identitySessionInfo!),
		name: q.data.name,
		isSuper,
		remark: q.data.remark ?? ''
	})

	ctx.body = {
		code: 0,
		msg: '创建成功'
	}
})

/** 返回当前用户允许创建的权限序列化列表 */
function filterAuthority(
	inspector: Awaited<ReturnType<typeof createRequestInspector>>,
	authority: string[],
	session: IdentitySession
) {
	if (authority.length === 0) return []
	let userAuthority: AuthorityConfigList | Permission
	if (session.info.isSuper) {
		userAuthority = authorityConfigList
	} else {
		userAuthority = session.permission
	}
	const list: any[] = []
	authority.forEach((id) => {
		const item = userAuthority.find((el) => el.meta!.id === id)
		if (item) list.push(item)
	})

	return inspector.rulesToSerialize(inspector.create<AuthMeta>(list, { base: sys.config.apiPath }))
}
