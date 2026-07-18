import type { UpdateSessionParams, GetSessionListParams, SessionInfo, CreateSessionParams } from './types'
import { tableMap } from '@server/config'
import { DbFit } from '@server/db/connect'
export * from './types'

const sessionInfo = tableMap.session_info
export class DbSessionInfo extends DbFit {
	create(id: string, value: CreateSessionParams) {
		return this.query<void>(
			'void',
			/*sql*/ `
				INSERT INTO ${sessionInfo.tableName} (id, value) 
				VALUES (:id, :value)
			`,
			{ id, value }
		)
	}

	del(id: string) {
		return this.query<void>(
			'void',
			/*sql*/ `
				UPDATE ${sessionInfo.tableName} 
				SET delete_time = :deleteTime 
				WHERE id = :id AND delete_time IS NULL
			`,
			{ id, deleteTime: new Date() }
		)
	}

	update(id: string, value: UpdateSessionParams) {
		return this.query<void>(
			'void',
			/*sql*/ `
				UPDATE ${sessionInfo.tableName} SET
					${this.ifNotVoid(value, 'value = :value,')}
					update_time = :updateTime
				WHERE id = :id AND delete_time IS NULL
			`,
			{ id, value: value, updateTime: new Date() }
		)
	}

	get(id: string) {
		return this.query<SessionInfo>(
			'info',
			/*sql*/ `
				SELECT id, value 
				FROM ${sessionInfo.tableName} 
				WHERE id = :id AND delete_time IS NULL
			`,
			{ id }
		)
	}

	getList(p?: GetSessionListParams) {
		return this.query<SessionInfo[]>(
			'list',
			/*sql*/ `
				SELECT id, value 
				FROM ${sessionInfo.tableName} 
				WHERE delete_time IS NULL ${this.ifel(p && p.page && p.size, 'LIMIT :page, :size')}
			`,
			{
				page: p && p.page && p.size ? (p.page - 1) * p.size : void 0,
				size: p?.size
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
