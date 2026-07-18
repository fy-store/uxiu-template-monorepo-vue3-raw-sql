import type mysql2 from 'mysql2/promise'

export type ReturnResultType = 'info' | 'list' | 'void' | 'origin'

export type QueryResult = {
	sql: string
	newSql: string
	newParams: any[]
	list: any[]
	execInfo: any
	originResult: [mysql2.QueryResult, mysql2.FieldPacket[]]
}
