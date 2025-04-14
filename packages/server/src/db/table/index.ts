import type { InitTable } from '#db'
import admin from './admin.js'
import userSession from './userSession.js'

const initTable: InitTable = async (ctx) => {
	await ctx.query.notLog(admin)
	await ctx.query.notLog(userSession)
}
export default initTable
