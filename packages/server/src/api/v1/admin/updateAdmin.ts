import type { IdentitySession } from '@server/config'
import type { AuthorityConfigList, Permission } from '@server/config'
import { DbAdmin } from '@server/db'
import { hash } from '@server/common'
import { authorityIdsToConfig, authorityConfigList } from '@server/config'
import { createRequestInspector } from 'uxiu'
import { updateAdminParamsSchema } from './schema'
import { defineCheckError } from '@server/utils'
import { sys } from '@server/config'
import { Router } from '@koa/router'

export const updateAdminRouter = new Router()
updateAdminRouter.post('/updateAdmin', async (ctx) => {
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
