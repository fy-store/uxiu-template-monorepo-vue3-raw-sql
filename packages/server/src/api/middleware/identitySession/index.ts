import type { Next, Context } from 'koa'
import type { IdentitySession as SessionType } from '@server/config'
import { DbSessionInfo } from '@server/db'
import { SessionStore, everydayTask } from 'uxiu'
import { sys } from '@server/config'

const map = new Map()
const sessionInfo = new DbSessionInfo({ ctx: null })
const sessionList = await sessionInfo.getList()
sessionInfo.submit()
sessionList.forEach((it) => {
	map.set(it.id, it.value)
})

export const sessionStore = new SessionStore().create<SessionType>({
	store: {
		async add(id, value) {
			map.set(id, value)
			using sessionInfo = new DbSessionInfo({ ctx: null })
			await sessionInfo.create(id, value)
			const r = map.get(id)
			await sessionInfo.submit()
			return r
		},

		async get(id) {
			return map.get(id)
		},

		async set(id, value) {
			map.set(id, value)
			using sessionInfo = new DbSessionInfo({ ctx: null })
			await sessionInfo.update(id, value)
			const r = map.get(id)
			await sessionInfo.submit()
			return r
		},

		async del(id) {
			using sessionInfo = new DbSessionInfo({ ctx: null })
			await sessionInfo.del(id)
			const data = map.get(id)
			map.delete(id)
			await sessionInfo.submit()
			return data
		},
		async each(fn) {
			map.forEach((value, id) => {
				fn(id, value)
			})
		},
		async length() {
			return map.size
		}
	}
})

// 定时清理过期的会话
setTimeout(() => {
	everydayTask(
		async () => {
			const now = Date.now()
			await sessionStore.each(async (id, value) => {
				if (now - value.latelyOperationTimer > sys.config.loginVerify.expireInterval) {
					await sessionStore.del(id)
				}
			})
		},
		{
			hour: 2,
			exceedImmediatelyExecute: true
		}
	)
}, 0)

/**
 * 注入身份会话仓库
 */
export function identitySession() {
	return async (ctx: Context, next: Next) => {
		ctx.identitySessionStore = sessionStore
		await next()
	}
}
