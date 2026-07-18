import type { DbFitEvents, DbFitOptions } from 'uxiu'
import { Bus, type InterfaceToType } from 'event-imt'
import {
	checkNameSchema,
	columnSchema,
	createColumnOptionsSchema,
	createTableOptionsSchema,
	defineTableOptionsSchema,
	updateColumnOptionsSchema
} from './schema'
import type {
	Column,
	ColumnListItem,
	ColumnInfo,
	CreateColumnOptions,
	CreateColumnResult,
	CreateDatabaseResult,
	CreateTableOptions,
	CreateTableResult,
	DataBaseListItem,
	DefineTableLog,
	DefineTableOptions,
	DefineTableQueryUtilResult,
	DefineTableResult,
	DeleteColumnResult,
	DeleteDatabaseResult,
	DeleteTableResult,
	TableListItem,
	UpdateColumnItem,
	UpdateColumnOptions,
	UpdateColumnResult,
	MySQLUtilDbFitOps,
	MySQLUtilDbFitEvents
} from './types'
import { DbFit, isObject, readonly } from 'uxiu'
import mysql2 from 'mysql2/promise'
export type * from './types'
export * from './schema'

/**
 * MySQL 工具类
 * - 提供常用的操作方法
 * - 默认编码使用 `utf8mb4`, 以支持完整的 `Unicode` 字符集
 * - 默认使用参数化查询, 对于一些无法参数化的操作限制输入格式以及 ` 拼接
 */
export class MySQLUtil extends DbFit {
	/** 连接池 */
	private _pool: mysql2.Pool
	/** 实例ID */
	private _exampleId: string = `${crypto.randomUUID()}-${Date.now()}`
	/**
	 * 连接对象
	 * - 注意:
	 * - 连接对象将在首次支持时创建, 创建是异步的, 所以如果需要并发执行需保证 connection 已完成创建
	 * - 通过调用 getConnection() 方法提前在首次请求前创建连接, 这是一个异步方法, 必须等待其完成方可并发调用
	 */
	private _connection: mysql2.PoolConnection | null = null
	/** 是否首次执行 sql 语句 */
	private _isFirst = false
	/** 申请的连接是否已完成, 未完成无法执行 sql 语句 */
	private _isConnectDone: null | boolean = null

	/** 连接池 */
	get pool() {
		return this._pool
	}
	/** 实例id */
	get exampleId() {
		return this._exampleId
	}
	/**
	 * 连接对象
	 * - 注意:
	 * - 连接对象将在首次支持时创建, 创建是异步的, 所以如果需要并发执行需保证 connection 已完成创建
	 * - 通过调用 getConnection() 方法提前在首次请求前创建连接, 这是一个异步方法, 必须等待其完成方可并发调用
	 */
	get connection() {
		return this._connection
	}
	/** 是否首次执行 sql 语句 */
	get isFirst() {
		return this._isFirst
	}
	/** 申请的连接是否已完成, 未完成无法执行 sql 语句 */
	get isConnectDone() {
		return this._isConnectDone
	}

	get bus(): Bus<InterfaceToType<DbFitEvents<this> & MySQLUtilDbFitEvents>> {
		return super.bus
	}

	/**
	 * MySQL 工具类
	 * @param options 配置选项
	 */
	constructor(options: MySQLUtilDbFitOps) {
		if (!isObject(options)) {
			throw new Error('MySQLUtil options must be an object')
		}

		super({
			query: async (sql, params) => {
				// 规范 sql 格式
				sql = sql.trim().replace(/[ \t\r]+/g, ' ')
				// 替换 sql 中的 :placeholder 为 ?
				const [newSql, newParams] = MySQLUtil.coverParams(sql, params)
				let isError = false
				let error: any = null
				try {
					// @ts-ignore
					const originResult = await this._connection![options?.queryMode ?? 'execute'](newSql, newParams)
					const result = originResult
					return result
				} catch (err) {
					isError = true
					error = err
					await this._connection!.rollback()
					throw err
				} finally {
					if (this.bus.has('queryLog')) {
						this.bus.emit('queryLog', this, {
							exampleId: this._exampleId,
							isError,
							error,
							originSql: sql,
							originParams: params,
							sql: newSql,
							params: newParams
						})
					}
				}
			},
			borrow: options?.borrow
		} as DbFitOptions)

		// 首次查询时建立连接
		this.bus.on('hook:firstQuery', async () => {
			this._isFirst = true
			// 如果执行了预连接则必须等待其完成才可执行 sql 语句
			if (this.isConnectDone === false) {
				throw new Error('MySQLUtil -> call getConnection() must wait it done')
			}
			if (this._connection) return
			this._connection = await this._pool.getConnection()
			// 开启事务
			await this._connection.beginTransaction()
		})

		// 实例销毁时根据触发类型执行操作, 然后释放连接, 提交类型: 提交事务, 错误类型|销毁类型: 回滚事务
		this.bus.on('hook:destroy', async (_, ctx) => {
			if (ctx.emitType === 'callSubmit') {
				await this._connection!.commit()
			} else {
				await this._connection!.rollback()
			}
			this._connection!.release()
			await this._pool.end()
		})

		// 创建连接池
		this._pool = mysql2.createPool({ charset: 'utf8mb4', ...options.poolOptions })
	}

	/**
	 * 同于在首次请求前创建连接, 这是一个异步方法, 必须等待其完成方可调用后续操作
	 * - 该方法的作用是将建立连接操作提前, 使得后续执行 sql 时可以并发执行
	 */
	async getConnection() {
		this._isConnectDone = false
		if (this.isFirst) {
			throw new Error('MySQLUtil -> call getConnection() must be called before the first query')
		}
		this._connection = await this._pool.getConnection()
		await this._connection.beginTransaction()
		this._isConnectDone = true
	}

	/**
	 * 获取所有数据库
	 */
	getDatabaseList(): Promise<DefineTableQueryUtilResult<DataBaseListItem[]>> {
		return this.query<DefineTableQueryUtilResult<DataBaseListItem[]>>('SHOW DATABASES')
	}

	/**
	 * 获取指定数据库的所有表
	 * @param databaseName 数据库名称
	 */
	getTableList(databaseName: string): Promise<DefineTableQueryUtilResult<TableListItem[]>> {
		if (!MySQLUtil.checkName(databaseName)) {
			throw new Error(MySQLUtil.getCheckNameErrorMessage('databaseName'))
		}
		return this.query<DefineTableQueryUtilResult<TableListItem[]>>(
			/*sql*/ `
				SELECT TABLE_NAME
				FROM INFORMATION_SCHEMA.TABLES
				WHERE TABLE_SCHEMA =  :databaseName
			`,
			{ databaseName }
		)
	}

	/**
	 * 获取指定数据库的指定表的所有列
	 * @param databaseName 数据库名称
	 * @param tableName 表名称
	 */
	getColumnList(databaseName: string, tableName: string): Promise<DefineTableQueryUtilResult<ColumnListItem[]>> {
		if (!MySQLUtil.checkName(databaseName)) {
			throw new Error(MySQLUtil.getCheckNameErrorMessage('databaseName'))
		}
		if (!MySQLUtil.checkName(tableName)) {
			throw new Error(MySQLUtil.getCheckNameErrorMessage('tableName'))
		}
		return this.query<DefineTableQueryUtilResult<ColumnListItem[]>>(
			/*sql*/ `
				SELECT COLUMN_NAME
				FROM INFORMATION_SCHEMA.COLUMNS
				WHERE TABLE_SCHEMA = :databaseName
				AND TABLE_NAME = :tableName
		`,
			{ databaseName, tableName }
		)
	}

	/**
	 * 获取指定数据库的指定表的指定列的信息
	 * @param databaseName 数据库名称
	 * @param tableName 表名称
	 * @param columnName 列名称
	 */
	getColumnInfo(
		databaseName: string,
		tableName: string,
		columnName: string
	): Promise<DefineTableQueryUtilResult<ColumnInfo[]>> {
		if (!MySQLUtil.checkName(databaseName)) {
			throw new Error(MySQLUtil.getCheckNameErrorMessage('databaseName'))
		}
		if (!MySQLUtil.checkName(tableName)) {
			throw new Error(MySQLUtil.getCheckNameErrorMessage('tableName'))
		}
		if (!MySQLUtil.checkName(columnName)) {
			throw new Error(MySQLUtil.getCheckNameErrorMessage('columnName'))
		}
		return this.query<DefineTableQueryUtilResult<ColumnInfo[]>>(
			/*sql*/ `
				SELECT *
				FROM INFORMATION_SCHEMA.COLUMNS
				WHERE TABLE_SCHEMA = :databaseName
				AND TABLE_NAME = :tableName
				AND COLUMN_NAME = :columnName
			`,
			{ databaseName, tableName, columnName }
		)
	}

	/**
	 * 创建一个或多个字段
	 * @param options 创建字段的选项
	 */
	createColumn(options: CreateColumnOptions): Promise<DefineTableQueryUtilResult<CreateColumnResult>> {
		const parseResult = createColumnOptionsSchema.safeParse(options)
		if (!parseResult.success) {
			throw parseResult.error
		}

		const alterSql: string[] = []
		const primaryKeys: string[] = []
		const uniqueKeys: string[] = []
		const indexKeys: string[] = []

		for (const column of options.columns) {
			alterSql.push(MySQLUtil.buildColumnDefinitionSql(column, 'add'))

			// 收集索引, 支持通过 generated 创建基于表达式的索引(会额外创建生成列)
			if ('index' in column && column.index) {
				const normalizedIndex = MySQLUtil.normalizeIndex(column.index) as any

				if (normalizedIndex) {
					if (normalizedIndex.type === 'primaryKey') {
						primaryKeys.push(column.name)
					} else if (normalizedIndex.type === 'unique') {
						if (normalizedIndex.generated && normalizedIndex.generated.expression) {
							const genName = normalizedIndex.name || `${column.name}_gen`
							alterSql.push(
								MySQLUtil.buildGeneratedColumnDefinition(
									genName,
									column,
									normalizedIndex.generated.expression,
									'add',
									normalizedIndex.generated.stored
								)
							)
							alterSql.push(
								MySQLUtil.buildAddIndexSql(
									MySQLUtil.ensureIndexPrefix(normalizedIndex, MySQLUtil.getColumnOptionLength(column)),
									genName
								)
							)
						} else {
							uniqueKeys.push(column.name)
						}
					} else if (normalizedIndex.type === 'index') {
						if (normalizedIndex.generated && normalizedIndex.generated.expression) {
							const genName = normalizedIndex.name || `${column.name}_gen`
							alterSql.push(
								MySQLUtil.buildGeneratedColumnDefinition(
									genName,
									column,
									normalizedIndex.generated.expression,
									'add',
									normalizedIndex.generated.stored
								)
							)
							alterSql.push(
								MySQLUtil.buildAddIndexSql(
									MySQLUtil.ensureIndexPrefix(normalizedIndex, MySQLUtil.getColumnOptionLength(column)),
									genName
								)
							)
						} else {
							indexKeys.push(column.name)
						}
					}
				}
			}
		}

		// 追加索引 sql
		if (primaryKeys.length > 0) {
			alterSql.push(`ADD PRIMARY KEY (\`${primaryKeys.join('`, `')}\`)`)
		}
		uniqueKeys.forEach((key) => {
			alterSql.push(`ADD UNIQUE KEY \`uk_${key}\` (\`${key}\`)`)
		})
		indexKeys.forEach((key) => {
			alterSql.push(`ADD KEY \`idx_${key}\` (\`${key}\`)`)
		})

		const sql = `ALTER TABLE \`${options.databaseName}\`.\`${options.tableName}\`\n  ${alterSql.join(',\n  ')}`

		return this.query<DefineTableQueryUtilResult<CreateColumnResult>>(sql)
	}

	/**
	 * 删除指定的列
	 * @param databaseName 数据库名称
	 * @param tableName 表名称
	 * @param columnName 列名称
	 */
	deleteColumn(
		databaseName: string,
		tableName: string,
		columnName: string
	): Promise<DefineTableQueryUtilResult<DeleteColumnResult>> {
		if (!MySQLUtil.checkName(databaseName)) {
			throw new Error(MySQLUtil.getCheckNameErrorMessage('databaseName'))
		}
		if (!MySQLUtil.checkName(tableName)) {
			throw new Error(MySQLUtil.getCheckNameErrorMessage('tableName'))
		}
		if (!MySQLUtil.checkName(columnName)) {
			throw new Error(MySQLUtil.getCheckNameErrorMessage('columnName'))
		}

		return this.query<DefineTableQueryUtilResult<DeleteColumnResult>>(
			`ALTER TABLE \`${databaseName}\`.\`${tableName}\` DROP COLUMN \`${columnName}\``
		)
	}

	/**
	 * 更新一个或多个字段
	 * @param options 更新的选项
	 */
	async updateColumn(options: UpdateColumnOptions): Promise<DefineTableQueryUtilResult<UpdateColumnResult>> {
		const parseResult = updateColumnOptionsSchema.safeParse(options)
		if (!parseResult.success) {
			throw parseResult.error
		}

		const alterSql: string[] = []

		for (const column of options.columns) {
			const normalizedColumn = await this.getUpdateColumnDefinition(options.databaseName, options.tableName, column)

			alterSql.push(MySQLUtil.buildColumnDefinitionSql(normalizedColumn.column, 'change', normalizedColumn.targetName))

			const currentNorm = normalizedColumn.currentIndex
				? MySQLUtil.normalizeIndex(normalizedColumn.currentIndex)
				: void 0
			const nextNorm =
				normalizedColumn.nextIndex !== undefined ? MySQLUtil.normalizeIndex(normalizedColumn.nextIndex) : void 0

			if (nextNorm !== undefined && (nextNorm.type ?? null) !== (currentNorm?.type ?? null)) {
				if (currentNorm) {
					alterSql.push(MySQLUtil.buildDropIndexSql(currentNorm, normalizedColumn.targetName))
				}

				// 如果新增索引使用生成列，先创建生成列再创建索引
				if (nextNorm && (nextNorm as any).generated && (nextNorm as any).generated.expression) {
					const genName = (nextNorm as any).name || `${normalizedColumn.column.name}_gen`
					alterSql.push(
						MySQLUtil.buildGeneratedColumnDefinition(
							genName,
							normalizedColumn.column,
							(nextNorm as any).generated.expression,
							'add',
							(nextNorm as any).generated.stored
						)
					)
					alterSql.push(
						MySQLUtil.buildAddIndexSql(
							MySQLUtil.ensureIndexPrefix(nextNorm as any, MySQLUtil.getColumnOptionLength(normalizedColumn.column)),
							genName
						)
					)
				} else {
					alterSql.push(
						MySQLUtil.buildAddIndexSql(
							MySQLUtil.ensureIndexPrefix(nextNorm as any, MySQLUtil.getColumnOptionLength(normalizedColumn.column)),
							normalizedColumn.column.name
						)
					)
				}
			}
		}

		const sql = `ALTER TABLE \`${options.databaseName}\`.\`${options.tableName}\`\n  ${alterSql.join(',\n  ')}`

		return await this.query<DefineTableQueryUtilResult<UpdateColumnResult>>(sql)
	}

	/**
	 * 创建一个数据库
	 * @param databaseName 数据库名称, a-z_0-9, 并且以字母开头
	 */
	createDatabase(databaseName: string): Promise<DefineTableQueryUtilResult<CreateDatabaseResult>> {
		if (!MySQLUtil.checkName(databaseName)) {
			throw new Error(MySQLUtil.getCheckNameErrorMessage('databaseName'))
		}
		return this.query<DefineTableQueryUtilResult<CreateDatabaseResult>>(/*sql*/ `
				CREATE DATABASE IF NOT EXISTS \`${databaseName}\` 
				DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci
			`)
	}

	/**
	 * 删除一个数据库
	 * @param databaseName 数据库名称, a-z_0-9, 并且以字母开头
	 */
	deleteDatabase(databaseName: string): Promise<DefineTableQueryUtilResult<DeleteDatabaseResult>> {
		if (!MySQLUtil.checkName(databaseName)) {
			throw new Error(MySQLUtil.getCheckNameErrorMessage('databaseName'))
		}
		return this.query<DefineTableQueryUtilResult<DeleteDatabaseResult>>(`DROP DATABASE IF EXISTS \`${databaseName}\``)
	}

	/**
	 * 创建一个表
	 * @param options 创建表的选项
	 */
	createTable(options: CreateTableOptions): Promise<DefineTableQueryUtilResult<CreateTableResult>> {
		const parseResult = createTableOptionsSchema.safeParse(options)
		if (!parseResult.success) {
			throw parseResult.error
		}

		const columnsSql: string[] = []
		const primaryKeys: string[] = []
		const uniqueKeys: string[] = []
		const indexKeys: string[] = []

		for (const column of options.columns) {
			columnsSql.push(MySQLUtil.buildColumnDefinitionSql(column, 'create'))

			// 收集索引
			if ('index' in column && column.index) {
				if (column.index === 'primaryKey') {
					primaryKeys.push(column.name)
				} else if (column.index === 'unique') {
					uniqueKeys.push(column.name)
				} else if (column.index === 'index') {
					indexKeys.push(column.name)
				}
			}
		}

		// 追加索引 sql
		if (primaryKeys.length > 0) {
			columnsSql.push(`PRIMARY KEY (\`${primaryKeys.join('`, `')}\`)`)
		}
		uniqueKeys.forEach((key) => {
			columnsSql.push(`UNIQUE KEY \`uk_${key}\` (\`${key}\`)`)
		})
		indexKeys.forEach((key) => {
			columnsSql.push(`KEY \`idx_${key}\` (\`${key}\`)`)
		})

		const tableComment = options.comment ? ` COMMENT '${options.comment.replace(/'/g, "''")}'` : ''

		const sql = `CREATE TABLE IF NOT EXISTS \`${options.databaseName}\`.\`${options.tableName}\` (\n  ${columnsSql.join(',\n  ')}\n)${tableComment}`

		return this.query<DefineTableQueryUtilResult<CreateTableResult>>(sql)
	}

	/**
	 * 删除一个表
	 * @params databaseName 数据库名称, a-z_0-9, 并且以字母开头
	 * @params tableName 表名称, a-z_0-9, 并且以字母开头
	 */
	deleteTable(databaseName: string, tableName: string): Promise<DefineTableQueryUtilResult<DeleteTableResult>> {
		if (!MySQLUtil.checkName(databaseName)) {
			throw new Error(MySQLUtil.getCheckNameErrorMessage('databaseName'))
		}
		if (!MySQLUtil.checkName(tableName)) {
			throw new Error(MySQLUtil.getCheckNameErrorMessage('tableName'))
		}
		return this.query<DefineTableQueryUtilResult<DeleteTableResult>>(
			`DROP TABLE IF EXISTS \`${databaseName}\`.\`${tableName}\``
		)
	}

	/**
	 * 定义一个表, 如果表不存在则创建, 如果表存在则更新表结构以匹配定义
	 * @param options 配置列表
	 * @param op 附加配置
	 */
	async defineTable(
		options: DefineTableOptions
	): Promise<{ logs: DefineTableLog[]; result: DefineTableQueryUtilResult<DefineTableResult> }> {
		const parseResult = defineTableOptionsSchema.safeParse(options)
		if (!parseResult.success) {
			throw parseResult.error
		}

		const logs: DefineTableLog[] = []
		let result = [
			{
				fieldCount: 0,
				affectedRows: 0,
				insertId: 0,
				info: '',
				serverStatus: 0,
				warningStatus: 0,
				changedRows: 0,
				stateChanges: {
					systemVariables: {},
					schema: null,
					gtids: [],
					trackStateChange: null
				}
			} as DefineTableResult,
			void 0
		] as DefineTableQueryUtilResult<DefineTableResult>

		const [tableRows] = await this.query<DefineTableQueryUtilResult<{ TABLE_NAME: string; TABLE_COMMENT: string }[]>>(
			/*sql*/ `
				SELECT TABLE_NAME, TABLE_COMMENT
				FROM INFORMATION_SCHEMA.TABLES
				WHERE TABLE_SCHEMA = :databaseName
				AND TABLE_NAME = :tableName
			`,
			{ databaseName: options.databaseName, tableName: options.tableName }
		)

		if (tableRows.length === 0) {
			const createSql = MySQLUtil.buildCreateTableSql(options)
			result = await this.query<DefineTableQueryUtilResult<DefineTableResult>>(createSql)

			logs.push({
				databaseName: options.databaseName,
				tableName: options.tableName,
				sql: createSql,
				operation: 'create'
			})

			return {
				logs,
				result
			}
		}

		if ((tableRows[0]?.TABLE_COMMENT ?? '') !== (options.comment ?? '')) {
			const commentSql = `ALTER TABLE \`${options.databaseName}\`.\`${options.tableName}\` COMMENT = '${MySQLUtil.escapeSqlString(options.comment ?? '')}'`
			result = await this.query<DefineTableQueryUtilResult<DefineTableResult>>(commentSql)

			logs.push({
				databaseName: options.databaseName,
				tableName: options.tableName,
				sql: commentSql,
				operation: 'update'
			})
		}

		const [columnRows] = await this.query<DefineTableQueryUtilResult<ColumnInfo[]>>(
			/*sql*/ `
				SELECT *
				FROM INFORMATION_SCHEMA.COLUMNS
				WHERE TABLE_SCHEMA = :databaseName
				AND TABLE_NAME = :tableName
			`,
			{ databaseName: options.databaseName, tableName: options.tableName }
		)

		const columnMap = new Map(columnRows.map((item) => [item.COLUMN_NAME, item]))

		for (const column of options.columns) {
			const currentInfo = columnMap.get(column.name)

			if (!currentInfo) {
				const addParts = [MySQLUtil.buildColumnDefinitionSql(column, 'add')]
				const columnIndex = MySQLUtil.getColumnOptionIndex(column)
				const normalizedIndex = columnIndex ? (MySQLUtil.normalizeIndex(columnIndex) as any) : void 0

				if (normalizedIndex) {
					// 如果索引配置包含 generated 表达式, 先创建生成列再创建索引
					if (normalizedIndex.generated && normalizedIndex.generated.expression) {
						const genName = normalizedIndex.name || `${column.name}_gen`
						// 生成列可能已存在(如上一轮 defineTable 已创建), 避免重复创建
						if (!columnMap.has(genName)) {
							addParts.push(
								MySQLUtil.buildGeneratedColumnDefinition(
									genName,
									column,
									normalizedIndex.generated.expression,
									'add',
									normalizedIndex.generated.stored
								)
							)
							addParts.push(
								MySQLUtil.buildAddIndexSql(
									MySQLUtil.ensureIndexPrefix(normalizedIndex, MySQLUtil.getColumnOptionLength(column)),
									genName
								)
							)
						}
					} else {
						addParts.push(
							MySQLUtil.buildAddIndexSql(
								MySQLUtil.ensureIndexPrefix(normalizedIndex, MySQLUtil.getColumnOptionLength(column)),
								column.name
							)
						)
					}
				}

				const addSql = `ALTER TABLE \`${options.databaseName}\`.\`${options.tableName}\`\n  ${addParts.join(',\n  ')}`
				result = await this.query<DefineTableQueryUtilResult<DefineTableResult>>(addSql)

				logs.push({
					databaseName: options.databaseName,
					tableName: options.tableName,
					columnName: column.name,
					sql: addSql,
					operation: 'create'
				})

				continue
			}

			const currentColumn = MySQLUtil.normalizeColumnInfo(currentInfo)
			const columnSqlList: string[] = []

			if (!MySQLUtil.isSameColumnDefinition(currentColumn, column)) {
				columnSqlList.push(MySQLUtil.buildColumnDefinitionSql(column, 'change', column.name))
			}

			const currentIndex = MySQLUtil.getColumnIndex(currentInfo)
			const nextIndex = MySQLUtil.getColumnOptionIndex(column)
			const currentNorm = currentIndex ? MySQLUtil.normalizeIndex(currentIndex) : void 0
			const nextNorm = nextIndex ? (MySQLUtil.normalizeIndex(nextIndex) as any) : void 0

			if ((currentNorm?.type ?? null) !== (nextNorm?.type ?? null)) {
				if (currentNorm) {
					columnSqlList.push(MySQLUtil.buildDropIndexSql(currentNorm, column.name))
				}

				if (nextNorm) {
					// 如果新增索引使用生成列, 需要先添加生成列
					if (nextNorm.generated && nextNorm.generated.expression) {
						const genName = nextNorm.name || `${column.name}_gen`
						// 生成列+索引可能已存在(如上一轮 defineTable 已创建), 避免重复创建
						if (!columnMap.has(genName)) {
							columnSqlList.push(
								MySQLUtil.buildGeneratedColumnDefinition(
									genName,
									column,
									nextNorm.generated.expression,
									'add',
									nextNorm.generated.stored
								)
							)
							columnSqlList.push(
								MySQLUtil.buildAddIndexSql(
									MySQLUtil.ensureIndexPrefix(nextNorm, MySQLUtil.getColumnOptionLength(column)),
									genName
								)
							)
						}
					} else {
						columnSqlList.push(
							MySQLUtil.buildAddIndexSql(
								MySQLUtil.ensureIndexPrefix(nextNorm, MySQLUtil.getColumnOptionLength(column)),
								column.name
							)
						)
					}
				}
			}

			if (columnSqlList.length === 0) {
				continue
			}

			const updateSql = `ALTER TABLE \`${options.databaseName}\`.\`${options.tableName}\`\n  ${columnSqlList.join(',\n  ')}`
			result = await this.query<DefineTableQueryUtilResult<DefineTableResult>>(updateSql)

			logs.push({
				databaseName: options.databaseName,
				tableName: options.tableName,
				columnName: column.name,
				sql: updateSql,
				operation: 'update'
			})
		}

		return {
			logs,
			result
		}
	}

	/**
	 * 判断对象上是否存在指定自有属性
	 * @param value 目标对象
	 * @param key 属性键名
	 */
	private static hasOwn<T extends object>(value: T, key: PropertyKey) {
		return Object.hasOwn(value, key)
	}

	/**
	 * 获取名称校验失败的错误提示
	 * @param field 名称字段名
	 */
	private static getCheckNameErrorMessage(field: 'databaseName' | 'tableName' | 'columnName') {
		return `Invalid ${field} name. only 1-64 lowercase letters, digits and underscore are allowed, it must start with a lowercase letter, and it cannot end with underscore, contain double underscore, or use MySQL reserved words.`
	}

	/**
	 * 转义 SQL 字符串中的单引号
	 * @param value 原始字符串
	 */
	private static escapeSqlString(value: string) {
		return value.replace(/'/g, "''")
	}

	/**
	 * 构建普通索引或唯一索引名称
	 * @param index 索引类型
	 * @param columnName 列名称
	 */
	/**
	 * 标准化索引配置为统一格式
	 * @param index 原始索引配置
	 */
	private static normalizeIndex(
		index: unknown
	): { type: 'primaryKey' | 'unique' | 'index'; prefix?: number } | undefined {
		if (!index) {
			return void 0
		}

		if (typeof index === 'string') {
			return { type: index as 'primaryKey' | 'unique' | 'index' }
		}

		if (typeof index === 'object' && index !== null && 'type' in (index as Record<string, unknown>)) {
			// support extended index options: prefix, name, generated
			const idx = index as Record<string, any>
			return {
				type: idx.type as 'primaryKey' | 'unique' | 'index',
				prefix: idx.prefix,
				name: idx.name,
				generated: idx.generated
			} as unknown as {
				type: 'primaryKey' | 'unique' | 'index'
				prefix?: number
				name?: string
				generated?: { expression: string; stored?: boolean }
			}
		}

		return void 0
	}

	/**
	 * 构建普通索引或唯一索引名称
	 * @param index 索引配置
	 * @param columnName 列名称
	 */
	private static buildIndexName(
		index: { type: 'primaryKey' | 'unique' | 'index'; prefix?: number; name?: string },
		columnName: string
	) {
		if (index.name && typeof index.name === 'string' && index.name.length > 0) {
			return index.name
		}
		return index.type === 'unique' ? `uk_${columnName}` : `idx_${columnName}`
	}

	/**
	 * 如果列长度太长导致索引超出 MySQL 最大键长度（3072 bytes），自动计算并填充合适的 prefix
	 * @param index 索引对象（会返回一个新的对象副本）
	 * @param columnLength 列字符长度（chars）
	 */
	private static ensureIndexPrefix(
		index: { type: string; prefix?: number; name?: string; generated?: any },
		columnLength?: number
	) {
		const copy: any = { ...index }
		if (copy.prefix === undefined && typeof columnLength === 'number') {
			// utf8mb4 最多 4 bytes/char, 单列 key 最大 3072 bytes
			const maxChars = Math.floor(3072 / 4)
			if (columnLength > maxChars) {
				copy.prefix = Math.min(columnLength, maxChars)
			}
		}
		return copy
	}

	/**
	 * 构建添加索引的 SQL 片段
	 * @param index 索引配置
	 * @param columnName 列名称
	 */
	private static buildAddIndexSql(
		index: {
			type: 'primaryKey' | 'unique' | 'index'
			prefix?: number
			name?: string
			generated?: { expression: string; stored?: boolean }
		},
		columnName: string
	) {
		if (index.type === 'primaryKey') {
			return `ADD PRIMARY KEY (\`${columnName}\`)`
		}

		// If index uses a generated column, the actual index column name is index.name if provided
		const indexColumn = index.generated ? index.name || columnName : columnName
		const indexName = MySQLUtil.buildIndexName(index, indexColumn)
		const prefixStr = index.prefix !== undefined ? `(${index.prefix})` : ''

		if (index.type === 'unique') {
			return `ADD UNIQUE KEY \`${indexName}\` (\`${indexColumn}\`${prefixStr})`
		}

		return `ADD KEY \`${indexName}\` (\`${indexColumn}\`${prefixStr})`
	}

	/**
	 * 构建删除索引的 SQL 片段
	 * @param index 索引配置
	 * @param columnName 列名称
	 */
	private static buildDropIndexSql(
		index: { type: 'primaryKey' | 'unique' | 'index'; prefix?: number },
		columnName: string
	) {
		if (index.type === 'primaryKey') {
			return 'DROP PRIMARY KEY'
		}

		return `DROP INDEX \`${MySQLUtil.buildIndexName(index, columnName)}\``
	}

	/**
	 * 根据表定义构建建表 SQL
	 * @param options 建表配置
	 */
	private static buildCreateTableSql(options: CreateTableOptions) {
		const columnsSql: string[] = []
		const primaryKeys: string[] = []
		const uniqueKeys: { columnName: string; prefix?: number; generated?: boolean; name?: string }[] = []
		const indexKeys: { columnName: string; prefix?: number; generated?: boolean; name?: string }[] = []

		for (const column of options.columns) {
			columnsSql.push(MySQLUtil.buildColumnDefinitionSql(column, 'create'))

			if ('index' in column && column.index) {
				const normalizedIndex = MySQLUtil.normalizeIndex(column.index) as any

				if (normalizedIndex) {
					if (normalizedIndex.type === 'primaryKey') {
						primaryKeys.push(column.name)
					} else if (normalizedIndex.type === 'unique') {
						if (normalizedIndex.generated && normalizedIndex.generated.expression) {
							const genName = normalizedIndex.name || `${column.name}_gen`
							columnsSql.push(
								MySQLUtil.buildGeneratedColumnDefinition(
									genName,
									column,
									normalizedIndex.generated.expression,
									'create',
									normalizedIndex.generated.stored
								)
							)
							uniqueKeys.push({
								columnName: genName,
								prefix: MySQLUtil.ensureIndexPrefix(normalizedIndex, MySQLUtil.getColumnOptionLength(column)).prefix,
								generated: true,
								name: normalizedIndex.name
							})
						} else {
							uniqueKeys.push({
								columnName: column.name,
								prefix: MySQLUtil.ensureIndexPrefix(normalizedIndex, MySQLUtil.getColumnOptionLength(column)).prefix,
								name: normalizedIndex.name
							})
						}
					} else if (normalizedIndex.type === 'index') {
						if (normalizedIndex.generated && normalizedIndex.generated.expression) {
							const genName = normalizedIndex.name || `${column.name}_gen`
							columnsSql.push(
								MySQLUtil.buildGeneratedColumnDefinition(
									genName,
									column,
									normalizedIndex.generated.expression,
									'create',
									normalizedIndex.generated.stored
								)
							)
							indexKeys.push({
								columnName: genName,
								prefix: MySQLUtil.ensureIndexPrefix(normalizedIndex, MySQLUtil.getColumnOptionLength(column)).prefix,
								generated: true,
								name: normalizedIndex.name
							})
						} else {
							indexKeys.push({
								columnName: column.name,
								prefix: MySQLUtil.ensureIndexPrefix(normalizedIndex, MySQLUtil.getColumnOptionLength(column)).prefix,
								name: normalizedIndex.name
							})
						}
					}
				}
			}
		}

		if (primaryKeys.length > 0) {
			columnsSql.push(`PRIMARY KEY (\`${primaryKeys.join('`, `')}\`)`)
		}

		uniqueKeys.forEach(({ columnName, prefix, name }) => {
			const prefixStr = prefix !== undefined ? `(${prefix})` : ''
			const indexName = name || `uk_${columnName}`
			columnsSql.push(`UNIQUE KEY \`${indexName}\` (\`${columnName}\`${prefixStr})`)
		})

		indexKeys.forEach(({ columnName, prefix, name }) => {
			const prefixStr = prefix !== undefined ? `(${prefix})` : ''
			const indexName = name || `idx_${columnName}`
			columnsSql.push(`KEY \`${indexName}\` (\`${columnName}\`${prefixStr})`)
		})

		const tableComment = options.comment ? ` COMMENT '${MySQLUtil.escapeSqlString(options.comment)}'` : ''

		return `CREATE TABLE IF NOT EXISTS \`${options.databaseName}\`.\`${options.tableName}\` (\n  ${columnsSql.join(',\n  ')}\n)${tableComment}`
	}

	/**
	 * 构建字段定义 SQL 片段
	 * @param column 字段定义
	 * @param mode 构建模式
	 * @param oldName 旧字段名称, 仅在 change 模式下使用
	 */
	private static buildColumnDefinitionSql(column: Column, mode: 'create' | 'add' | 'change', oldName?: string) {
		const arr: string[] = []

		if (mode === 'add') {
			arr.push(`ADD COLUMN \`${column.name}\``)
		} else if (mode === 'change') {
			if (!oldName) {
				throw new Error('oldName is required when mode is change')
			}

			arr.push(`CHANGE COLUMN \`${oldName}\` \`${column.name}\``)
		} else {
			arr.push(`\`${column.name}\``)
		}

		if (column.type === 'varchar' || column.type === 'char') {
			arr.push(`${column.type.toUpperCase()}(${column.length})`)
		} else {
			arr.push(column.type.toUpperCase())
		}

		if (!column.allowNull) {
			arr.push('NOT NULL')
		}

		if ('default' in column && column.default !== undefined) {
			if (column.default === null) {
				arr.push('DEFAULT NULL')
			} else if (column.type === 'datetime' && column.default === 'current_timestamp') {
				arr.push('DEFAULT CURRENT_TIMESTAMP')
			} else if (column.default instanceof Date) {
				arr.push(`DEFAULT '${column.default.toISOString().slice(0, 19).replace('T', ' ')}'`)
			} else if (typeof column.default === 'string') {
				arr.push(`DEFAULT '${MySQLUtil.escapeSqlString(column.default)}'`)
			} else {
				arr.push(`DEFAULT ${column.default}`)
			}
		}

		if ('autoIncrement' in column && column.autoIncrement) {
			arr.push('AUTO_INCREMENT')
		}

		if ('onUpdate' in column && column.onUpdate === 'current_timestamp') {
			arr.push('ON UPDATE CURRENT_TIMESTAMP')
		}

		if ('comment' in column && column.comment !== undefined) {
			arr.push(`COMMENT '${MySQLUtil.escapeSqlString(column.comment)}'`)
		}

		return arr.join(' ')
	}

	/**
	 * 构建生成列定义（用于基于表达式的索引）
	 * @param genName 生成列名
	 * @param baseColumn 基础列定义，用于推断类型/长度
	 * @param expression 生成列表达式
	 * @param mode 模式: 'create'|'add'|'change'
	 * @param stored 是否为 STORED（默认为 true）
	 */
	private static buildGeneratedColumnDefinition(
		genName: string,
		baseColumn: Column,
		expression: string,
		mode: 'create' | 'add' | 'change',
		stored?: boolean
	) {
		const parts: string[] = []

		if (mode === 'add') {
			parts.push(`ADD COLUMN \`${genName}\``)
		} else if (mode === 'change') {
			parts.push(`CHANGE COLUMN \`${genName}\` \`${genName}\``)
		} else {
			parts.push(`\`${genName}\``)
		}

		if (baseColumn.type === 'varchar' || baseColumn.type === 'char') {
			parts.push(`${baseColumn.type.toUpperCase()}(${baseColumn.length})`)
		} else {
			parts.push(baseColumn.type.toUpperCase())
		}

		const storedStr = stored === false ? 'VIRTUAL' : 'STORED'

		// GENERATED 子句必须紧跟在数据类型之后
		parts.push(`GENERATED ALWAYS AS (${expression}) ${storedStr}`)

		// 生成列可为 NULL
		parts.push('NULL')

		return parts.join(' ')
	}

	/**
	 * 从数据库字段信息推导内部字段类型
	 * @param info 数据库字段信息
	 */
	private static getColumnType(info: ColumnInfo): Column['type'] {
		const type = info.DATA_TYPE.toLowerCase()

		switch (type) {
			case 'bigint':
			case 'int':
			case 'tinyint':
			case 'varchar':
			case 'char':
			case 'text':
			case 'datetime':
			case 'json':
				return type
			default:
				throw new Error(`Unsupported column type: ${info.DATA_TYPE}`)
		}
	}

	/**
	 * 从数据库字段信息中提取索引类型
	 * @param info 数据库字段信息
	 */
	private static getColumnIndex(info: ColumnInfo): 'primaryKey' | 'unique' | 'index' | undefined {
		switch (info.COLUMN_KEY) {
			case 'PRI':
				return 'primaryKey'
			case 'UNI':
				return 'unique'
			case 'MUL':
				return 'index'
			default:
				return void 0
		}
	}

	/**
	 * 获取字段长度信息
	 * @param info 数据库字段信息
	 */
	private static getColumnLength(info: ColumnInfo) {
		if (info.CHARACTER_MAXIMUM_LENGTH !== null) {
			return info.CHARACTER_MAXIMUM_LENGTH
		}

		const match = info.COLUMN_TYPE.match(/\((\d+)\)/)

		if (match) {
			return Number(match[1])
		}

		return void 0
	}

	/**
	 * 获取字段默认值并转换为内部定义格式
	 * @param info 数据库字段信息
	 * @param type 字段类型
	 */
	private static getColumnDefault(info: ColumnInfo, type: Column['type']) {
		const { COLUMN_DEFAULT: columnDefault, IS_NULLABLE: isNullable } = info

		if (columnDefault === null) {
			return isNullable === 'YES' && type !== 'text' && type !== 'json' ? null : void 0
		}

		if (type === 'datetime') {
			const defaultValue = String(columnDefault).toLowerCase()

			return defaultValue.includes('current_timestamp') ? 'current_timestamp' : String(columnDefault)
		}

		if (type === 'bigint') {
			return String(columnDefault)
		}

		if (type === 'int' || type === 'tinyint') {
			return Number(columnDefault)
		}

		if (type === 'varchar' || type === 'char') {
			return String(columnDefault)
		}

		return void 0
	}

	/**
	 * 将数据库字段信息标准化为内部字段定义
	 * @param info 数据库字段信息
	 */
	private static normalizeColumnInfo(info: ColumnInfo) {
		const type = MySQLUtil.getColumnType(info)
		const column: Record<string, any> = {
			name: info.COLUMN_NAME,
			type,
			allowNull: info.IS_NULLABLE === 'YES'
		}

		const index = MySQLUtil.getColumnIndex(info)
		const length = MySQLUtil.getColumnLength(info)
		const defaultValue = MySQLUtil.getColumnDefault(info, type)
		const extra = info.EXTRA.toLowerCase()

		if (index) {
			column.index = index
		}

		if (type === 'varchar' || type === 'char') {
			if (length === undefined) {
				throw new Error(`Column ${info.COLUMN_NAME} missing length metadata`)
			}

			column.length = length
		}

		if (defaultValue !== undefined) {
			column.default = defaultValue
		}

		if (extra.includes('auto_increment')) {
			column.autoIncrement = true
		}

		if (type === 'datetime' && extra.includes('on update current_timestamp')) {
			column.onUpdate = 'current_timestamp'
		}

		if (info.COLUMN_COMMENT !== '') {
			column.comment = info.COLUMN_COMMENT
		}

		return columnSchema.parse(column)
	}

	/**
	 * 获取字段配置中的索引类型
	 * @param column 字段定义
	 */
	private static getColumnOptionIndex(column: Column) {
		return 'index' in column ? column.index : void 0
	}

	/**
	 * 获取字段配置中的自增标记
	 * @param column 字段定义
	 */
	private static getColumnOptionAutoIncrement(column: Column) {
		return 'autoIncrement' in column ? column.autoIncrement : void 0
	}

	/**
	 * 获取字段配置中的自动更新时间配置
	 * @param column 字段定义
	 */
	private static getColumnOptionOnUpdate(column: Column) {
		return 'onUpdate' in column ? column.onUpdate : void 0
	}

	/**
	 * 获取字段配置中的长度信息
	 * @param column 字段定义
	 */
	private static getColumnOptionLength(column: Column) {
		return 'length' in column ? column.length : void 0
	}

	/**
	 * 获取字段配置中的默认值
	 * @param column 字段定义
	 */
	private static getColumnOptionDefault(column: Column) {
		return 'default' in column ? column.default : void 0
	}

	/**
	 * 判断两个字段定义是否一致
	 * @param left 当前字段定义
	 * @param right 目标字段定义
	 */
	private static isSameColumnDefinition(left: Column, right: Column) {
		if (left.name !== right.name) {
			return false
		}

		if (left.type !== right.type) {
			return false
		}

		if (left.allowNull !== right.allowNull) {
			return false
		}

		const leftIndexNorm = MySQLUtil.normalizeIndex(MySQLUtil.getColumnOptionIndex(left))
		const rightIndexNorm = MySQLUtil.normalizeIndex(MySQLUtil.getColumnOptionIndex(right))

		if ((leftIndexNorm?.type ?? null) !== (rightIndexNorm?.type ?? null)) {
			return false
		}

		if ((left.comment ?? '') !== (right.comment ?? '')) {
			return false
		}

		if (
			(MySQLUtil.getColumnOptionAutoIncrement(left) ?? false) !==
			(MySQLUtil.getColumnOptionAutoIncrement(right) ?? false)
		) {
			return false
		}

		if ((MySQLUtil.getColumnOptionOnUpdate(left) ?? null) !== (MySQLUtil.getColumnOptionOnUpdate(right) ?? null)) {
			return false
		}

		if (
			(left.type === 'varchar' || left.type === 'char') &&
			MySQLUtil.getColumnOptionLength(left) !== MySQLUtil.getColumnOptionLength(right)
		) {
			return false
		}

		return MySQLUtil.isSameDefaultValue(MySQLUtil.getColumnOptionDefault(left), MySQLUtil.getColumnOptionDefault(right))
	}

	/**
	 * 比较两个默认值是否一致
	 * @param left 左侧默认值
	 * @param right 右侧默认值
	 */
	private static isSameDefaultValue(left: unknown, right: unknown) {
		if (left instanceof Date || right instanceof Date) {
			if (!(left instanceof Date) || !(right instanceof Date)) {
				return false
			}

			return left.getTime() === right.getTime()
		}

		return left === right
	}

	/**
	 * 读取并合成更新字段后的完整定义
	 * @param databaseName 数据库名称
	 * @param tableName 表名称
	 * @param updateItem 更新配置项
	 */
	private async getUpdateColumnDefinition(databaseName: string, tableName: string, updateItem: UpdateColumnItem) {
		const targetName = updateItem.oldName || updateItem.name

		if (!targetName) {
			throw new Error('oldName and name can not both be empty')
		}

		const [columnInfoList] = await this.getColumnInfo(databaseName, tableName, targetName)
		const currentInfo = columnInfoList[0]

		if (!currentInfo) {
			throw new Error(`Column ${targetName} does not exist`)
		}

		const currentColumn = MySQLUtil.normalizeColumnInfo(currentInfo)
		const nextColumn: Record<string, any> = {
			...currentColumn
		}

		if (MySQLUtil.hasOwn(updateItem, 'name') && updateItem.name !== undefined) {
			nextColumn.name = updateItem.name
		}

		if (MySQLUtil.hasOwn(updateItem, 'type') && updateItem.type !== undefined) {
			nextColumn.type = updateItem.type
		}

		if (MySQLUtil.hasOwn(updateItem, 'length')) {
			if (updateItem.length === undefined) {
				delete nextColumn.length
			} else {
				nextColumn.length = updateItem.length
			}
		}

		if (MySQLUtil.hasOwn(updateItem, 'allowNull') && updateItem.allowNull !== undefined) {
			nextColumn.allowNull = updateItem.allowNull
		}

		if (MySQLUtil.hasOwn(updateItem, 'default')) {
			if (updateItem.default === undefined) {
				delete nextColumn.default
			} else {
				nextColumn.default = updateItem.default
			}
		}

		if (MySQLUtil.hasOwn(updateItem, 'comment')) {
			if (updateItem.comment === undefined) {
				delete nextColumn.comment
			} else {
				nextColumn.comment = updateItem.comment
			}
		}

		if (MySQLUtil.hasOwn(updateItem, 'index') && updateItem.index !== undefined) {
			nextColumn.index = updateItem.index
		}

		if (MySQLUtil.hasOwn(updateItem, 'autoIncrement') && updateItem.autoIncrement !== undefined) {
			nextColumn.autoIncrement = updateItem.autoIncrement
		}

		if (MySQLUtil.hasOwn(updateItem, 'onUpdate')) {
			if (updateItem.onUpdate === undefined) {
				delete nextColumn.onUpdate
			} else {
				nextColumn.onUpdate = updateItem.onUpdate
			}
		}

		return {
			targetName,
			currentIndex: MySQLUtil.getColumnIndex(currentInfo),
			nextIndex: MySQLUtil.hasOwn(updateItem, 'index') ? updateItem.index : void 0,
			column: columnSchema.parse(nextColumn)
		}
	}

	/** utf8mb4 编码各类型安全取值范围 */
	static readonly utf8mb4_safeValue = readonly({
		tinyint: {
			/** 最小整数 */
			min: -128,
			/** 最大整数 */
			max: 127
		},
		smallint: {
			/** 最小整数 */
			min: -32768,
			/** 最大整数 */
			max: 32767
		},
		mediumint: {
			/** 最小整数 */
			min: -8388608,
			/** 最大整数 */
			max: 8388607
		},
		int: {
			/** 最小整数 */
			min: -2147483648,
			/** 最大整数 */
			max: 2147483647
		},
		bigint: {
			/** 最小整数 */
			min: -9223372036854775808n,
			/** 最大整数 */
			max: 9223372036854775807n
		},
		char: {
			/** 最小长度 */
			min: 0,
			/** 最大长度 */
			max: 255
		},
		varchar: {
			/** 最小长度 */
			min: 0,
			/** 最大长度 */
			max: 16383
		},
		tinytext: {
			/** 最小长度 */
			min: 0,
			/** 最大长度 */
			max: 63
		},
		text: {
			/** 最小长度 */
			min: 0,
			/** 最大长度 */
			max: 16383
		},
		mediumtext: {
			/** 最小长度 */
			min: 0,
			/** 最大长度 */
			max: 4194303
		},
		longtext: {
			/** 最小长度 */
			min: 0,
			/** 最大长度 */
			max: 1073741823
		}
	})

	/**
	 * 将 sql 中的 :placeholder 替换为 ?
	 * 并将对应的参数值放入 query 数组中
	 */
	static coverParams<T extends Record<string, any> = Record<string, any>>(
		sql: string,
		params: T = {} as T
	): [string, any[]] {
		const reg = /:\w+/g
		const query: any[] = []
		const newSql = sql.replace(reg, (match) => {
			const sign = match.slice(1)
			const value = params[sign]
			if (value !== void 0) {
				if (typeof value === 'boolean') {
					query.push(value ? 1 : 0)
				} else if (typeof value === 'number') {
					query.push(String(value))
				} else if (Array.isArray(value)) {
					query.push(...value)
					return value.map(() => '?').join(', ')
				} else {
					query.push(value)
				}
			} else {
				throw new Error(`"${match}" placeholder can not find correspond in params`)
			}
			return '?'
		})
		return [newSql, query]
	}

	/**
	 * 校验名称是否合法（只能包含小写字母、数字和下划线，并且必须以字母或下划线开头）
	 * @param name 名称
	 */
	static checkName(name: string) {
		return checkNameSchema.safeParse(name).success
	}
}
