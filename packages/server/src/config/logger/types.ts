import type { ResultInfo, ReturnResultType } from '@server/db/connect/privateTypes'
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
	callName?: string | symbol
	callPlace?: string 
	callStack?: string[]
	result?: {
		/** 执行结果信息 */
		resultInfo: ResultInfo
		/** 数据元信息 */
		dataMetaInfo: {
			/** 数据类型（如 'object', 'array', 'undefined' 等） */
			type: string
			/** 键值对数量（仅对对象类型有效） */
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
