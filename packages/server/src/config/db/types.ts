import type { DefineTableOptions } from '@server/db/utils'

export type TableDefineName<T extends readonly DefineTableOptions[]> = T[number]['tableName']

export type TableDefineMap<T extends readonly DefineTableOptions[]> = {
	[K in TableDefineName<T>]: Extract<T[number], { tableName: K }>
}
