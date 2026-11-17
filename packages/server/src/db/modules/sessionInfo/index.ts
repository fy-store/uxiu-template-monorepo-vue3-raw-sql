import type { UpdateSessionParams, GetSessionListParams, SessionInfo, CreateSessionParams } from './types'
import { tableMap } from '@server/config'
import { DbFit, type BaseResult } from '@server/db/connect'
import {
	createSessionParamsSchema,
	deleteSessionParamsSchema,
	getSessionListParamsSchema,
	getSessionParamsSchema,
	updateSessionParamsSchema
} from './schema'
export * from './types'

const sessionInfo = tableMap.session_info
export class DbSessionInfo extends DbFit {
	create(id: string, value: CreateSessionParams) {
		const params = createSessionParamsSchema.parse({ id, value })
		return this.query<BaseResult>(
			'insert',
			/*sql*/ `
				INSERT INTO ${sessionInfo.tableName} (id, value) 
				VALUES (:id, :value)
			`,
			params
		)
	}

	del(id: string) {
		const params = deleteSessionParamsSchema.parse({ id })
		return this.query<void>(
			'void',
			/*sql*/ `
				UPDATE ${sessionInfo.tableName} 
				SET delete_time = :deleteTime 
				WHERE id = :id AND delete_time IS NULL
			`,
			{ ...params, deleteTime: new Date() }
		)
	}

	update(id: string, value: UpdateSessionParams) {
		const params = updateSessionParamsSchema.parse({ id, value })
		return this.query<void>(
			'void',
			/*sql*/ `
				UPDATE ${sessionInfo.tableName} SET
					${this.ifNotVoid(params.value, 'value = :value,')}
					update_time = :updateTime
				WHERE id = :id AND delete_time IS NULL
			`,
			{ ...params, updateTime: new Date() }
		)
	}

	get(id: string) {
		const params = getSessionParamsSchema.parse({ id })
		return this.query<SessionInfo>(
			'info',
			/*sql*/ `
				SELECT id, value 
				FROM ${sessionInfo.tableName} 
				WHERE id = :id AND delete_time IS NULL
			`,
			params
		)
	}

	getList(p?: GetSessionListParams) {
		const { page, size } = getSessionListParamsSchema.parse(p ?? {})
		return this.query<SessionInfo[]>(
			'list',
			/*sql*/ `
				SELECT id, value 
				FROM ${sessionInfo.tableName} 
				WHERE delete_time IS NULL ${this.ifel(page && size, 'LIMIT :page, :size')}
			`,
			{
				page: page && size ? (page - 1) * size : void 0,
				size
			}
		)
	}

	getCount() {
		return this.query<{ count: number }>(
			'info',
			/*sql*/ `
				SELECT COUNT(*) as count FROM ${sessionInfo.tableName} WHERE delete_time IS NULL
			`
		)
	}
}
