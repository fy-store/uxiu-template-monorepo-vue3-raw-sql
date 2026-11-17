import type { Column, DefineTableOptions } from '@server/db/utils'
import type { ColumnDefineMap, ColumnName, TableDefineMap, TableDefineName } from './types'

/**
 * 定义数据库表
 * @template T 表定义类型
 * @param tables 表定义数组
 * @returns 表定义数组
 */
export function defineTables<const T extends DefineTableOptions[]>(tables: T | DefineTableOptions[]): T {
	return tables as T
}

/**
 * 将表定义数组转换为表定义映射
 * @template T 表定义类型
 * @param tables 表定义数组
 * @returns 表定义映射
 */
export function tableDefineToMap<const T extends readonly DefineTableOptions[]>(
	tables: T & readonly DefineTableOptions[]
): TableDefineMap<T> {
	const map = {} as TableDefineMap<T>

	for (const table of tables) {
		const tableName = table.tableName as TableDefineName<T>
		map[tableName] = table as TableDefineMap<T>[typeof tableName]
	}

	return map
}

/**
 * 将列定义数组转换为列定义映射
 * @template T 列定义类型
 * @param columns 列定义数组
 * @returns 列定义映射
 */
export function columnsToMap<const T extends readonly Column[]>(columns: T & readonly Column[]): ColumnDefineMap<T> {
	const map = {} as ColumnDefineMap<T>

	for (const column of columns) {
		const columnName = column.name as ColumnName<T>
		map[columnName] = column as ColumnDefineMap<T>[typeof columnName]
	}

	return map
}
