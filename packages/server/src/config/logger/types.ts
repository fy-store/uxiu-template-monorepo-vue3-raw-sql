import type { ReturnResultType } from '@server/db/connect/privateTypes'
import type { DBFitDestroyCtx } from 'uxiu'

export interface SqlQueryLog {
	type: 'query'
	requestId?: string
	exampleId: string
	sql: string
	query: Record<string, any>
	sqlRollback?: boolean
	originSql: string
	originQuery?: Record<string, any>
	returnType: ReturnResultType
	error?: any
	result?: {
		execInfo: any
		dataMetaInfo: {
			type: string
			keyLength?: number
		}
	}
}

export interface DestroyExampleLog {
	type: 'destroy'
	requestId?: string
	exampleId: string
	message: string
	ctx: DBFitDestroyCtx
}

export interface ParseSqlErrorLog {
	type: 'parseError'
	requestId?: string
	exampleId: string
	sql: string
	params: Record<string, any>
	error: string
}
