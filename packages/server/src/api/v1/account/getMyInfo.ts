import type { MyInfo } from './types'
import { authorityConfigList } from '@server/config'
import { DbAdmin } from '@server/db'
import { Router } from '@koa/router'

export const getMyInfoRouter = new Router()
getMyInfoRouter.get('/getMyInfo', async (ctx) => {
	const { id, isSuper } = ctx.identitySessionInfo!.info
	const admin = new DbAdmin({ ctx })
	const info = await admin.getInfo(id, isSuper)
	const authority = isSuper ? authorityConfigList : info.authority
	ctx.body = {
		code: 0,
		msg: '获取信息成功',
		data: {
			...info,
			authority: authority.map((it) => {
				return {
					id: it.meta!.id,
					name: it.meta!.name,
					path: it.path,
					methods: it.methods
				}
			})
		} as MyInfo
	}
})
