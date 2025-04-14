import type { Next, Context } from 'koa'
import { Session, everydayTask } from 'uxiu'
import { userSession as dbUserSession } from '#db'

const map = new Map()
const [sessionList] = await dbUserSession.getList()
sessionList.forEach((it) => {
	map.set(it.sessionId, it.sessionValue)
})

const sessionStore = Session.createSessionStore({
	store: {
		async add(id, value) {
			await dbUserSession.create({ sessionId: id, sessionValue: value })
			map.set(id, value)
			return map.get(id)
		},

		async get(id) {
			return map.get(id)
		},

		async set(id, value) {
			await dbUserSession.updateBySessionId({ sessionId: id, sessionValue: value })
			map.set(id, value)
			return map.get(id)
		},

		async del(id) {
			await dbUserSession.deleteBySessionId(id)
			const data = map.get(id)
			map.delete(id)
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

everydayTask(
	async () => {
		const now = Date.now()
		sessionStore.each(async (id, value: any) => {
			if (now - value.latelyOperationTimer > $.sysConf.project.loginVerify.expireInterval) {
				await sessionStore.del(id)
			}
		})
	},
	{
		hour: 2,
		exceedImmediatelyExecute: true
	}
)

export const userSession = () => {
	return async (ctx: Context, next: Next) => {
		ctx.userSessionStore = sessionStore
		await next()
	}
}
