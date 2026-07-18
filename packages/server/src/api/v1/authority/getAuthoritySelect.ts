import type { Authority } from './types'
import type { AuthorityTree } from '@server/config'
import { authorityTree, authorityConfigToTree } from '@server/config'
import { Router } from '@koa/router'

export const getAuthoritySelectRouter = new Router()
/**
 * 超管返回所有权限
 * 其他管理员/用户仅返回其自身拥有的权限
 */
getAuthoritySelectRouter.get('/getAuthoritySelect', async (ctx) => {
	if (ctx.identitySessionInfo?.info.isSuper) {
		ctx.body = {
			code: 0,
			data: filterSensitive(authorityTree)
		}
		return
	}

	ctx.body = {
		code: 0,
		msg: '登录成功',
		data: filterSensitive(authorityConfigToTree(ctx.identitySessionInfo!.permission))
	}
})

/** 脱敏 */
function filterSensitive(authoritySelect: AuthorityTree): Authority[] {
	return authoritySelect.map((it) => {
		if (it.children) {
			return {
				id: it.id,
				name: it.name,
				children: filterSensitive(it.children)
			}
		} else {
			return {
				id: it.id,
				name: it.name
			}
		}
	})
}
