import init from './init.js'
import mysql2 from 'mysql2/promise'
import { isNumber } from 'uxiu'
import { logger } from '#common'
import color from 'picocolors'

const { host, port, database, user, password } = sys.conf.mysql.connect
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

const shutdown = async () => {
	await pool.end()
	console.log(color.green('tip: MySQL 连接池已关闭'), '\n')
	process.exit(0)
}

// 监听 `Ctrl + C`
process.on('SIGINT', shutdown)

// 监听 `kill` 命令
process.on('SIGTERM', shutdown)

export const execute = async <T1 = any[], T2 = any>(sql: string, query = [], toJSON?: boolean): Promise<[T1, T2]> => {
	try {
		const result: any = await pool.execute(
			sql,
			query.map((it) => (isNumber(it) ? String(it) : it))
		)
		const data = {
			sql: sql.trim().replace(/\s+/g, ' '),
			query,
			result: toJSON ? JSON.stringify(result, null, 2) : `tip: 日志隐藏数据, data -> length = ${result.length}`
		}
		logger.db.info(data)
		return result
	} catch (error) {
		const data = { sql: sql.trim().replace(/\s+/g, ' '), query, error }
		logger.db.error(data)
		error.sql = data.sql
		error.sqlQuery = data.query
		throw error
	}
}

execute.notLog = async <T1 = any[], T2 = any>(sql: string, query = []): Promise<[T1, T2]> => {
	try {
		return (await pool.execute(
			sql,
			query.map((it) => (isNumber(it) ? String(it) : it))
		)) as unknown as Promise<[T1, T2]>
	} catch (error) {
		const data = { sql: sql.trim().replace(/\s+/g, ' '), query, error }
		logger.db.error(data)
		error.sql = data.sql
		error.sqlQuery = data.query
		throw error
	}
}

export const query = async <T1 = any[], T2 = any>(sql: string, query = [], toJSON?: boolean): Promise<[T1, T2]> => {
	try {
		const result: any = await pool.query(sql, query)
		const data = {
			sql: sql.trim().replace(/\s+/g, ' '),
			query,
			result: toJSON ? JSON.stringify(result, null, 2) : `tip: 日志隐藏数据, data -> length = ${result.length}`
		}
		logger.db.info(data)
		return result
	} catch (error) {
		const data = { sql: sql.trim().replace(/\s+/g, ' '), query, error }
		logger.db.error(data)
		error.sql = data.sql
		error.sqlQuery = data.query
		throw error
	}
}

query.notLog = async <T1 = any[], T2 = any>(sql: string, query = []): Promise<[T1, T2]> => {
	try {
		return (await pool.query(
			sql,
			query.map((it) => (isNumber(it) ? String(it) : it))
		)) as unknown as Promise<[T1, T2]>
	} catch (error) {
		const data = { sql: sql.trim().replace(/\s+/g, ' '), query, error }
		logger.db.error(data)
		error.sql = data.sql
		error.sqlQuery = data.query
		throw error
	}
}

export default {
	pool,
	query,
	execute
}
