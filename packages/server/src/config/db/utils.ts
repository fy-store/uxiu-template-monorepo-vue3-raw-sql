import type { DefineTableOptions } from '@server/db/utils'
import type { TableDefineMap, TableDefineName } from './types'

export function defineTables<const T extends DefineTableOptions[]>(tables: T | DefineTableOptions[]): T {
	return tables as T
}

export const tableDefineToMap = <const T extends readonly DefineTableOptions[]>(
	tables: T & readonly DefineTableOptions[]
): TableDefineMap<T> => {
	const map = {} as TableDefineMap<T>

	for (const table of tables) {
		const tableName = table.tableName as TableDefineName<T>
		map[tableName] = table as TableDefineMap<T>[typeof tableName]
	}

	return map
}
