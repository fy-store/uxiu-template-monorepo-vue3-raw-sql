import type { AuthMeta, AuthorityConfigList, IdentitySession, Permission } from '@server/config'
import { createRequestInspector } from 'uxiu'
import { hash } from '@server/common'
import { DbAdmin } from '@server/db'
import { authorityIdsToConfig, authorityConfigList } from '@server/config'
import { createAdminParamsSchema, deleteAdminParamsSchema, updateAdminParamsSchema } from './schema'
import { defineCheckError } from '@server/utils'
import { sys } from '@server/config'
import { Router } from '@koa/router'

export const postRouter = new Router()

postRouter.post('/createAdmin', async (ctx) => {
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

postRouter.post('/deleteAdmin', async (ctx) => {
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

postRouter.post('/updateAdmin', async (ctx) => {
	const inspector = await createRequestInspector()
	const q = updateAdminParamsSchema.safeParse(ctx.request.body)
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

	await admin.update({
		...q.data,
		// 非超管修改无效
		isSuper: ctx.identitySessionInfo?.info.isSuper ? q.data.isSuper : void 0,
		authority: (function () {
			const allowOperateAuthority = filterAllowOperateAuthority(q.data.authority ?? [], ctx.identitySessionInfo!)
			const addAuthority = filterAddAuthority(allowOperateAuthority, info.authority)
			const removeAuthority = filterRemoveAuthority(allowOperateAuthority, info.authority)
			const originAuthority = info.authority.map((it) => it.meta!.id)
			return inspector.rulesToSerialize(
				inspector.create(
					authorityIdsToConfig([
						// 数据库中原始的配置 + 新增的配置 - 移除的配置
						...new Set(originAuthority.concat(addAuthority).filter((id) => !removeAuthority.includes(id)))
					]),
					{ base: sys.config.apiPath }
				)
			)
		})(),
		password: q.data.password ? await hash.encode(q.data.password) : void 0
	})

	ctx.body = {
		code: 0,
		msg: '更新成功'
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

/** 返回允许操作的权限 */
function filterAllowOperateAuthority(authority: string[], session: IdentitySession) {
	const userAuthority: AuthorityConfigList = session.info.isSuper
		? authorityConfigList
		: (session.permission as AuthorityConfigList)
	return authority.filter((id) => userAuthority.find((it) => it.meta.id === id))
}

/** 返回新增的权限 */
function filterAddAuthority(authority: string[], originAuthority: Permission) {
	return authority.filter((id) => !originAuthority.find((it) => it.meta!.id === id))
}

/** 返回移除的权限 */
function filterRemoveAuthority(authority: string[], originAuthority: Permission) {
	return originAuthority.filter((it) => !authority.find((id) => id === it.meta!.id)).map((it) => it.meta!.id)
}
