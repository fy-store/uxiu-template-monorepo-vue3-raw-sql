export type * from './types/index.js'
export * from './connect/index.js'
export * as admin from './modules/admin/index.js'
export * as userSession from './modules/userSession/index.js'
import initTable from '@/db/table/index.js'
import { pool, execute, query } from './connect/index.js'

if (initTable) {
	await initTable({ pool, execute, query })
}
