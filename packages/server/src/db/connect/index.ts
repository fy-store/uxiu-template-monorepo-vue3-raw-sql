import type { ProxyCtx, QueryResult, ResultInfo, ReturnResultType } from './privateTypes'
import type { DestroyExampleLog, ParseSqlErrorLog, SqlQueryLog } from '@server/config'
import type { DbFitOps } from './types'
import { AsyncLocalStorage } from 'node:async_hooks'
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

type DbCallContext = Pick<ProxyCtx, 'callName' | 'callPlace'>
const dbCallContextStorage = new AsyncLocalStorage<DbCallContext>()

/** 获取 V8 调用栈, 可跳过当前代理函数 */
function getCallStack(skipFunction?: Function) {
	const error = new Error()
	if (skipFunction) Error.captureStackTrace(error, skipFunction)
	return (error.stack ?? '')
		.split('\n')
		.slice(1)
		.map((it) => it.trim())
}

/** 获取第一个非运行时依赖的调用位置 */
function getCallPlace(stack: string[]) {
	const frames = stack
		.map((line) => line.match(/\((.*)\)$/)?.at(1) ?? line.match(/^at (?:async )?(.+)$/)?.at(1) ?? '')
		.filter(Boolean)
	const isRuntimeInternal = (location: string) => {
		const normalizedLocation = location.replace(/\\/g, '/').toLowerCase()
		return normalizedLocation.startsWith('node:') || normalizedLocation.includes('/node_modules/')
	}

	return frames.find((location) => !isRuntimeInternal(location)) ?? frames.at(0) ?? ''
}

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

/**
 * 数据库连接适配器
 */
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

		const query = async (
			proxyCtx: ProxyCtx,
			returnType: ReturnResultType,
			sql: string,
			params: Record<string, any> = {}
		) => {
			const { callName = '', callPlace = '', callStack = [] } = proxyCtx
			// 规范 sql 格式
			sql = sql.trim().replace(/[ \t\r]+/g, ' ')
			// 替换 sql 中的 :placeholder 为 ?
			const [newSql, newParams] = this.#coverParams(sql, params, options, proxyCtx)
			// 记录当前执行的 sql 信息
			this._log = {
				type: 'query',
				requestId: options.ctx?.requestId,
				exampleId: this.exampleId,
				callName,
				callPlace,
				callStack,
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
				const [execResult, execInfo]: [any, Record<string, any> | undefined] = originResult
				this._log.sqlRollback = false
				this._result = {
					sql,
					newSql,
					newParams,
					result: execResult,
					execInfo,
					originResult
				}
				const { fieldCount, affectedRows, insertId, warningStatus, changeRows } = (execResult ?? {}) as ResultInfo
				const resultInfo: ResultInfo = { fieldCount, affectedRows, insertId, warningStatus, changeRows }
				// 根据不同的 returnType 返回不同的数据
				let result: unknown
				if (returnType === 'list' || returnType === 'insert') {
					const type = getType(execResult)
					this._log.result = {
						resultInfo,
						dataMetaInfo: {
							type,
							keyLength: type === 'object' ? Object.keys(execResult).length : undefined
						}
					}
					result = execResult
				} else if (returnType === 'info') {
					const type = getType(execResult[0])
					this._log.result = {
						resultInfo,
						dataMetaInfo: {
							type,
							keyLength: type === 'object' ? Object.keys(execResult[0]).length : undefined
						}
					}
					result = execResult[0]
				} else if (returnType === 'void') {
					this._log.result = {
						resultInfo,
						dataMetaInfo: {
							type: 'undefined'
						}
					}
					result = void 0
				} else {
					const type = getType(execResult)
					this._log.result = {
						resultInfo,
						dataMetaInfo: {
							type,
							keyLength: type === 'object' ? Object.keys(execResult).length : undefined
						}
					}
					result = originResult
				}
				return result
			} catch (error) {
				// 记录错误信息并回滚事务
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
		}

		super({
			query,
			borrow: options?.borrow
		} as DbFitOptions)

		// 首次查询时建立连接并开启事务
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

		// 实例销毁时根据触发类型执行操作, 然后释放连接. 提交类型: 提交事务; 错误类型|销毁类型: 回滚事务
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
		const ctx = options.ctx
		if (ctx) {
			ctx.bus.on('error', async (error) => {
				console.error(error)
				if (this.isDestroyed) return
				await this.destroy(true, {
					requestId: ctx.requestId,
					exampleId: this.exampleId,
					message: '路由中发生了错误, 但路由中为对事务状态进行提交或回滚, 以自动执行 sql 回滚操作'
				})
			})
			ctx.bus.on('success', async () => {
				if (this.isDestroyed) return
				await this.submit({
					requestId: ctx.requestId,
					exampleId: this.exampleId,
					message: 'sql 执行成功, 但路由中未提交, 已自动提交'
				})
			})
		}

		/** 注入代理上下文 */
		return this.#proxyMethods(this)
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

	/**
	 * 将 sql 中的 :placeholder 替换为 ?
	 * 并将对应的参数值放入 query 数组中
	 */
	#coverParams<T extends Record<string, any> = Record<string, any>>(
		sql: string,
		params: T = {} as T,
		options: DbFitOps,
		proxyCtx: ProxyCtx
	): [string, any[]] {
		const { callName = '', callPlace = '' } = proxyCtx
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
				const logInfo = {
					type: 'parseError',
					requestId: options.ctx?.requestId,
					exampleId: this.exampleId,
					sql,
					params,
					error: `${String(callName)}\n${callPlace}\nError: "${match}" placeholder can not find correspond in params`
				} satisfies ParseSqlErrorLog
				dbLogger.error(logInfo)
				throw new Error(logInfo.error)
			}
			return '?'
		})
		return [newSql, query]
	}

	/**
	 * 代理实例方法, 为 query 方法添加上下文
	 * @param obj 需要被代理的实例
	 */
	#proxyMethods(obj: DbFit) {
		const map = new Map<Function, Function>()
		// 得到当前实例(不包含子类方法)和父类方法的键名
		const methodKeys = [...Object.getOwnPropertyNames(_DbFit.prototype), ...Object.getOwnPropertyNames(this)].filter(
			(k) => typeof this[k as keyof DbFitOptions] === 'function'
		)
		return new Proxy(obj, {
			get(target, p, receiver) {
				const queryName = 'query'
				const value = Reflect.get(target, p, receiver)
				// 当前实例和父类的方法(除query方法)外的, 不做处理
				if (methodKeys.includes(p as string) && typeof value === 'function' && p !== queryName) {
					return value
				}
				// 仅处理方法
				if (typeof value === 'function') {
					const cache = map.get(value)
					if (cache) {
						return cache
					} else {
						const proxyFunc = function (...args: any[]) {
							// 注入代理上下文
							if (p === queryName) {
								const callStack = getCallStack()
								const callContext = dbCallContextStorage.getStore()
								const proxyCtx: ProxyCtx = {
									callName: callContext?.callName ?? '',
									callPlace: callContext?.callPlace ?? getCallPlace(getCallStack(proxyFunc)),
									callStack
								}
								return Reflect.apply(value, receiver, [proxyCtx, ...args])
							}
							const parentContext = dbCallContextStorage.getStore()
							const callContext: DbCallContext = {
								callName: p,
								callPlace: parentContext?.callPlace ?? getCallPlace(getCallStack(proxyFunc))
							}
							return dbCallContextStorage.run(callContext, () => Reflect.apply(value, receiver, args))
						}
						map.set(value, proxyFunc)
						return proxyFunc
					}
				}
				return value
			}
		})
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
