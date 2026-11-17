import type mysql2 from 'mysql2/promise'
import type { DbFit } from 'uxiu'
import type { z } from 'zod'
import type {
	bigintTypeSchema,
	intTypeSchema,
	tinyIntTypeSchema,
	charTypeSchema,
	varcharTypeSchema,
	textTypeSchema,
	dateTimeTypeSchema,
	jsonTypeSchema,
	columnSchema,
	createTableOptionsSchema,
	createColumnOptionsSchema,
	updateColumnItemSchema,
	updateColumnOptionsSchema,
	defineTableOptionsSchema
} from './schema'
import type { MySQLUtil } from './index'

export interface DataBaseListItem {
	/** 数据库名称 */
	Database: string
}

export interface TableListItem {
	/** 表名称 */
	TABLE_NAME: string
}

export interface ColumnListItem {
	/** 列名称 */
	COLUMN_NAME: string
}

export interface ColumnInfo {
	/** 表所属目录（一般为 'def'） */
	TABLE_CATALOG: string
	/** 表所属数据库名 */
	TABLE_SCHEMA: string
	/** 表名 */
	TABLE_NAME: string
	/** 列名 */
	COLUMN_NAME: string
	/** 列在表中的位置（从 1 开始） */
	ORDINAL_POSITION: number
	/** 列默认值 */
	COLUMN_DEFAULT: any
	/** 是否允许为 NULL（'YES' | 'NO'） */
	IS_NULLABLE: string
	/** 列数据类型（如 'varchar', 'int' 等） */
	DATA_TYPE: string
	/** 字符类型最大长度（如 varchar 的长度），非字符类型为 null */
	CHARACTER_MAXIMUM_LENGTH: number | null
	/** 字符类型最大字节长度，非字符类型为 null */
	CHARACTER_OCTET_LENGTH: number | null
	/** 数值类型精度，非数值类型为 null */
	NUMERIC_PRECISION: number | null
	/** 数值类型小数位数，非数值类型为 null */
	NUMERIC_SCALE: number | null
	/** 时间类型精度，非时间类型为 null */
	DATETIME_PRECISION: number | null
	/** 字符集名称，非字符类型为 null */
	CHARACTER_SET_NAME: string | null
	/** 排序规则名称，非字符类型为 null */
	COLLATION_NAME: string | null
	/** 列完整类型定义（如 'int(11) unsigned'） */
	COLUMN_TYPE: string
	/** 列键类型（如 'PRI', 'UNI', 'MUL'） */
	COLUMN_KEY: string
	/** 额外信息（如 'auto_increment'） */
	EXTRA: string
	/** 权限（如 'select,insert,update,references'） */
	PRIVILEGES: string
	/** 列注释 */
	COLUMN_COMMENT: string
	/** 生成列的表达式（如有则为表达式，否则为空字符串） */
	GENERATION_EXPRESSION: string
	/** 空间参考系统 ID，空间类型有值，否则为 null */
	SRS_ID: number | null
}

export interface BaseResult {
	/** 字段数量 */
	fieldCount: number
	/** 受影响的行数，创建数据库成功时通常为 1 */
	affectedRows: number
	/** 插入的自增 ID（创建数据库时一般为 0） */
	insertId: number
	/** 其他信息 */
	info: string
	/** 服务器状态码 */
	serverStatus: number
	/** 警告数量 */
	warningStatus: number
	/** 实际发生变化的行数 */
	changedRows: number
	/** 状态变更同步信息 */
	stateChanges: {
		/** 系统变量变更 */
		systemVariables: Record<string, any>
		/** Schema 变更（切换数据库） */
		schema: string | null
		/** GTID 相关变更状态 */
		gtids: string[]
		/** 会话状态跟踪数据 */
		trackStateChange: string | null
	}
}

export interface CreateDatabaseResult extends BaseResult {}

export interface DeleteDatabaseResult extends BaseResult {}

export interface CreateTableResult extends BaseResult {}

export interface DeleteTableResult extends BaseResult {}

export interface CreateColumnResult extends BaseResult {}

export interface DeleteColumnResult extends BaseResult {}

export interface UpdateColumnResult extends BaseResult {}

export interface DefineTableResult extends BaseResult {}

export type DefineTableQueryUtilResult<Data = any, Extra = Record<string, any> | undefined> = [Data, Extra]

export type BigintType = z.infer<typeof bigintTypeSchema>
export type IntType = z.infer<typeof intTypeSchema>
export type TinyIntType = z.infer<typeof tinyIntTypeSchema>
export type VarcharType = z.infer<typeof varcharTypeSchema>
export type CharType = z.infer<typeof charTypeSchema>
export type TextType = z.infer<typeof textTypeSchema>
export type DateTimeType = z.infer<typeof dateTimeTypeSchema>
export type JsonType = z.infer<typeof jsonTypeSchema>
export type Column = z.infer<typeof columnSchema>
export type CreateTableOptions = z.infer<typeof createTableOptionsSchema>
export type CreateColumnOptions = z.infer<typeof createColumnOptionsSchema>
export type UpdateColumnItem = z.infer<typeof updateColumnItemSchema>
export type UpdateColumnOptions = z.infer<typeof updateColumnOptionsSchema>
export type DefineTableOptions = z.infer<typeof defineTableOptionsSchema>

export interface DefineTableLog {
	/** 数据库名称 */
	databaseName: string
	/** 表名称 */
	tableName: string
	/** 操作的列名称, 如果操作表则为空 */
	columnName?: string
	/** 执行的 SQL */
	sql: string
	/** 操作类型, 无操作则为空 */
	operation?: 'create' | 'update'
}

export interface MySQLUtilDbFitOps {
	/** mysql2 连接池配置选项 */
	poolOptions: mysql2.PoolOptions
	/** 查询模式, 默认为 execute */
	queryMode?: 'query' | 'execute'
	/** 借用已有实例, 实现共享操作|连接|事务 */
	borrow?: DbFit
}

export interface QueryLogInfo {
	exampleId: string
	isError: boolean
	error: null | any
	originSql: string
	originParams: Record<string, any>
	sql: string
	params: Record<string, any>
}

export type MySQLUtilDbFitEvents = {
	queryLog: (self: MySQLUtil, log: QueryLogInfo) => void
}
