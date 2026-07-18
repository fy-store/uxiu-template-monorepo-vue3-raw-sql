import type { QueryResult, ReturnResultType } from './privateTypes'
import type { DestroyExampleLog, ParseSqlErrorLog, SqlQueryLog } from '@server/config'
import type { DbFitOps } from './types'
import crypto from 'node:crypto'
import { DbFit as _DbFit, isObject, type DbFitOptions } from 'uxiu'
import mysql2 from 'mysql2/promise'
import { sys } from '@server/config'
import { logger } from '@server/common'
import init from './init'
import { getType } from '@server/utils'
export * from '../utils'
export type * from './types'

const dbLogger = logger.category('db')
const { host, port, database, user, password } = sys.config.mysql.connect
await init()

// 创建连接池
export const pool = mysql2.createPool({
	host,
	port,
	database,
	user,
	password,
	charset: 'utf8mb4',
	multipleStatements: true,
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0,
	enableKeepAlive: true,
	keepAliveInitialDelay: 0,
	maxIdle: 10,
	idleTimeout: 0
})

export class DbFit extends _DbFit<{
	query: (returnType: ReturnResultType, sql: string, params?: Record<string, any>) => Promise<any>
}> {
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
	/** 当前查询日志信息 */
	private _log: SqlQueryLog | null = null
	/** 查询详细结果 */
	private _result: QueryResult | null = null

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
	/** 当前查询日志信息 */
	get log() {
		return this._log
	}
	/** 查询详细结果 */
	get result() {
		return this._result
	}

	constructor(options: DbFitOps) {
		if (!isObject(options)) {
			throw new Error('DbFit options must be an object')
		}

		if (!(isObject(options.ctx) || options.ctx === null)) {
			throw new Error('DbFit options.ctx must be a Koa Context or null')
		}

		super({
			query: async (returnType, sql, params) => {
				const callName = this._getStackFirstDesignateFn()
				// 规范 sql 格式
				sql = sql.trim().replace(/[ \t\r]+/g, ' ')
				// 替换 sql 中的 :placeholder 为 ?
				const [newSql, newParams] = this._coverParams(sql, params, options, callName)
				// 记录当前执行的 sql 信息
				this._log = {
					type: 'query',
					requestId: options.ctx?.requestId,
					exampleId: this.exampleId,
					sql: newSql,
					query: newParams,
					sqlRollback: void 0,
					originSql: sql,
					originQuery: params,
					returnType
				} satisfies SqlQueryLog

				try {
					// @ts-ignore
					const originResult = await this._connection![options?.queryMode ?? 'execute'](newSql, newParams)
					const [list, execInfo]: [any, Record<string, any> | undefined] = originResult
					this._log.sqlRollback = false
					this._result = {
						sql,
						newSql,
						newParams,
						list,
						execInfo,
						originResult
					}

					// 根据不同的 returnType 返回不同的数据
					let result: unknown
					if (returnType === 'list') {
						const type = getType(list)
						this._log.result = {
							dataMetaInfo: {
								type,
								keyLength: type === 'object' ? Object.keys(list).length : undefined
							},
							execInfo
						}
						result = list
					} else if (returnType === 'info') {
						const type = getType(list[0])
						this._log.result = {
							dataMetaInfo: {
								type,
								keyLength: type === 'object' ? Object.keys(list[0]).length : undefined
							},
							execInfo
						}
						result = list[0]
					} else if (returnType === 'void') {
						this._log.result = {
							dataMetaInfo: {
								type: 'undefined'
							},
							execInfo
						}
						result = void 0
					} else {
						const type = getType(list)
						this._log.result = {
							dataMetaInfo: {
								type,
								keyLength: type === 'object' ? Object.keys(list).length : undefined
							},
							execInfo
						}
						result = list
					}
					return result
				} catch (error) {
					this._log.error = error
					if (isObject(error)) {
						error.sql = newSql
						error.query = newParams
						error.originSql = sql
						error.originQuery = params
					}
					await this._connection!.rollback()
					this._log.sqlRollback = true
					throw error
				} finally {
					dbLogger.info(this._log)
				}
			},
			borrow: options?.borrow
		} as DbFitOptions)

		// 首次查询时建立连接
		this.bus.on('hook:firstQuery', async () => {
			this._isFirst = true
			// 如果执行了预连接则必须等待其完成才可执行 sql 语句
			if (this.isConnectDone === false) {
				throw new Error('DbFit -> call getConnection() must wait it done')
			}
			if (this._connection) return
			this._connection = await pool.getConnection()
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
			dbLogger.info({
				type: 'destroy',
				requestId: options.ctx?.requestId,
				exampleId: this.exampleId,
				message: '连接已释放',
				ctx
			} satisfies DestroyExampleLog)
		})

		// 清理副作用
		if (options.ctx) {
			options.ctx.bus.on('error', async () => {
				if (this.isDestroyed) return
				await this.destroy(true, {
					requestId: options.ctx?.requestId,
					exampleId: this.exampleId,
					message: '路由错误, sql 已回滚'
				})
			})
			options.ctx.bus.on('success', async () => {
				if (this.isDestroyed) return
				await this.submit({
					requestId: options.ctx?.requestId,
					exampleId: this.exampleId,
					message: '请求成功, 但路由中未提交, 已自动提交'
				})
			})
		}
	}

	/**
	 * 提前在首次请求前创建连接, 这是一个异步方法, 必须等待方可并发调用
	 */
	async getConnection() {
		this._isConnectDone = false
		if (this.isFirst) {
			throw new Error('DbFit -> call getConnection() must be called before the first query')
		}
		this._connection = await pool.getConnection()
		await this._connection.beginTransaction()
		this._isConnectDone = true
	}

	private _getStackFirstDesignateFn() {
		const err = new Error()
		try {
			const stackList = (err.stack ?? '').split('\n').map((it) => it.trim())
			for (let i = stackList.length - 1; i > 0; i--) {
				const line = stackList[i]!
				if (
					line.startsWith('at async <anonymous> ') ||
					line.startsWith('at <anonymous> ') ||
					line.startsWith('at async Object.<anonymous> ')
				) {
					continue
				}
				// 去除 at 和空格
				const name = line.slice(3)
				if (name) {
					return name
				}
			}
		} catch (error) {
			return ''
		}
		return ''
	}

	/**
	 * 将 sql 中的 :placeholder 替换为 ?
	 * 并将对应的参数值放入 query 数组中
	 */
	private _coverParams<T extends Record<string, any> = Record<string, any>>(
		sql: string,
		params: T = {} as T,
		options: DbFitOps,
		callName?: string
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
				dbLogger.error({
					type: 'parseError',
					requestId: options.ctx?.requestId,
					exampleId: this.exampleId,
					sql,
					params,
					error: `${callName ? `${callName} \n--> ` : ''}"${match}" placeholder can not find correspond in params`
				} satisfies ParseSqlErrorLog)
				throw new Error(
					`${callName ? `${callName} \n--> ` : ''}"${match}" placeholder can not find correspond in params`
				)
			}
			return '?'
		})
		return [newSql, query]
	}
}

export async function execute<T = any>(
	sql: Parameters<DbFit['query']>[1],
	query?: Parameters<DbFit['query']>[2]
): Promise<T> {
	const dbFit = new DbFit({ queryMode: 'execute', ctx: null })
	const result = await dbFit.query('origin', sql, query)
	await dbFit.submit()
	return result
}

export async function query<T = any>(
	sql: Parameters<DbFit['query']>[1],
	query?: Parameters<DbFit['query']>[2]
): Promise<T> {
	const dbFit = new DbFit({ queryMode: 'query', ctx: null })
	const result = await dbFit.query('origin', sql, query)
	await dbFit.submit()
	return result
}

export default {
	pool,
	query,
	execute,
	DbFit
}
