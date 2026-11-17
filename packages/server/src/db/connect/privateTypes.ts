import type mysql2 from 'mysql2/promise'

export type ReturnResultType = 'info' | 'list' | 'void' | 'origin' | 'insert'

export type QueryResult = {
	sql: string
	newSql: string
	newParams: any[]
	result: any
	execInfo: any
	originResult: [mysql2.QueryResult, mysql2.FieldPacket[]]
}

export interface ResultInfo {
	/** 字段数量 */
	fieldCount?: number
	/** 受影响的行数 */
	affectedRows?: number
	/** 插入的自增 ID */
	insertId?: number
	/** 警告数量 */
	warningStatus?: number
	/** 实际发生变化的行数 */
	changeRows?: number
}

export interface ProxyCtx {
	/** 调用方法 */
	callName: string | symbol
	/** 调用位置 */
	callPlace: string
	/** 原始的调用栈 */
	callStack: string[]
}
