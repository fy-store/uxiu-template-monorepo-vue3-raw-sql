import type { AdminConfig, AdminConfigValue } from './types'
import { DbFit } from '@server/db/connect'
import { tableMap } from '@server/config'
import { getAdminConfigParamsSchema, upsertAdminConfigParamsSchema } from './schema'
export * from './types'

const adminConfig = tableMap.admin_config

export class DbAdminConfig extends DbFit {
	/** 获取指定管理员的个性化配置 */
	get(adminId: number) {
		const params = getAdminConfigParamsSchema.parse({ adminId })
		return this.query<AdminConfig>(
			'info',
			/*sql*/ `
				SELECT id, admin_id AS adminId, value, create_time AS createTime, update_time AS updateTime
				FROM ${adminConfig.tableName}
				WHERE admin_id = :adminId AND delete_time IS NULL
			`,
			params
		)
	}

	/** 创建或更新指定管理员的个性化配置 */
	upsert(adminId: number, value: AdminConfigValue) {
		const params = upsertAdminConfigParamsSchema.parse({ adminId, value })
		return this.query<void>(
			'void',
			/*sql*/ `
				INSERT INTO ${adminConfig.tableName} (admin_id, value)
				VALUES (:adminId, :value)
				ON DUPLICATE KEY UPDATE
					value = VALUES(value),
					update_time = :updateTime,
					delete_time = NULL
			`,
			{
				...params,
				value: JSON.stringify(params.value),
				updateTime: new Date()
			}
		)
	}
}
