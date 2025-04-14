import type { Authority } from '#router'
import { authorityTree, configToTree } from '#conf'
import type { ReadonlyAuthorityTree } from '#conf'

/**
 * 超管返回所有权限
 * 其他管理员仅返回其自身拥有的权限
 */
$.router.get('/getAuthoritySelect', async (ctx) => {
	if (ctx.userSession.isSuper) {
		ctx.body = {
			code: 0,
			data: filterSensitive(authorityTree)
		}
		return
	}

	ctx.body = {
		code: 0,
		msg: '登录成功',
		data: filterSensitive(configToTree(ctx.userSession.authority))
	}
})

/** 脱敏 */
function filterSensitive(authoritySelect: Authority[] | ReadonlyAuthorityTree) {
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
