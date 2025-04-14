import mysql from 'mysql2/promise'

export type Query = {
	<T1 = any[], T2 = any>(sql: string, query?: any[], toJSON?: boolean): Promise<[T1, T2]>
	notLog<T1 = any[], T2 = any>(sql: string, query?: any[]): Promise<[T1, T2]>
}
export type Execute = {
	<T1 = any[], T2 = any>(sql: string, query?: any[], toJSON?: boolean): Promise<[T1, T2]>
	notLog<T1 = any[], T2 = any>(sql: string, query?: any[]): Promise<[T1, T2]>
}

/**
 * db 上下文
 */
export interface DbCtx {
	/**
	 * 数据库实例
	 */
	pool: mysql.Pool
	/**
	 * 用于操作数据库
	 */
	query: Query
	/**
	 * 用于操作数据库(带缓存优化)
	 */
	execute: Execute
}

/**
 * 初始化 table
 */
export interface InitTable {
	(ctx: DbCtx): void | Promise<void>
}
