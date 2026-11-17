import type { Column, DefineTableOptions } from '@server/db/utils'

export type TableDefineName<T extends readonly DefineTableOptions[]> = T[number]['tableName']

export type TableDefineMap<T extends readonly DefineTableOptions[]> = {
	[K in TableDefineName<T>]: Extract<T[number], { tableName: K }>
}

export type ColumnName<T extends readonly Column[]> = T[number]['name']

export type ColumnDefineMap<T extends readonly Column[]> = {
	[K in ColumnName<T>]: Extract<T[number], { name: K }>
}
