import type {
	ApiClient,
	ApiClientAuth,
	CreateApiClientParams,
	DeleteApiClientParams,
	GetApiClientByKeyIdParams,
	GetApiClientListCountParams,
	GetApiClientListParams,
	GetApiClientParams,
	ResetApiClientKeyParams,
	UpdateApiClientParams
} from './types'
import { DbFit, type BaseResult } from '@server/db/connect'
import { tableMap } from '@server/config'
import {
	apiClientPermissionsSchema,
	createApiClientParamsSchema,
	deleteApiClientParamsSchema,
	getApiClientByKeyIdParamsSchema,
	getApiClientListCountParamsSchema,
	getApiClientListParamsSchema,
	getApiClientParamsSchema,
	resetApiClientKeyParamsSchema,
	updateApiClientParamsSchema
} from './schema'
export * from './types'

const { tableName } = tableMap.api_client

/** API 客户端数据访问 */
export class DbApiClient extends DbFit {
	/** 创建 API 客户端 */
	create(p: CreateApiClientParams) {
		const params = createApiClientParamsSchema.parse(p)
		return this.query<BaseResult>(
			'insert',
			/* sql */ `
				INSERT INTO ${tableName} (name, remark, permissions, key_id, key_hash, is_enabled, expire_time)
				VALUES (:name, :remark, :permissions, :keyId, :keyHash, :isEnabled, :expireTime)
			`,
			{
				name: params.name,
				remark: params.remark ?? '',
				permissions: JSON.stringify(params.permissions),
				keyId: params.keyId,
				keyHash: params.keyHash,
				isEnabled: params.isEnabled ?? true,
				expireTime: params.expireTime ?? null
			}
		)
	}

	/** 删除 API 客户端(软删除) */
	del(id: DeleteApiClientParams['id']) {
		const { id: clientId } = deleteApiClientParamsSchema.parse({ id })
		return this.query<void>(
			'void',
			/* sql */ `
				UPDATE ${tableName} SET delete_time = :deleteTime WHERE id = :id AND delete_time IS NULL
			`,
			{ id: clientId, deleteTime: new Date() }
		)
	}

	/** 更新 API 客户端 */
	update(p: UpdateApiClientParams) {
		const params = updateApiClientParamsSchema.parse(p)
		return this.query<void>(
			'void',
			/* sql */ `
				UPDATE ${tableName} SET
					${this.ifNotVoid(params.name, 'name = :name,')}
					${this.ifNotVoid(params.remark, 'remark = :remark,')}
					${this.ifNotVoid(params.permissions, 'permissions = :permissions,')}
					${this.ifNotVoid(params.isEnabled, 'is_enabled = :isEnabled,')}
					${this.ifNotVoid(params.expireTime, 'expire_time = :expireTime,')}
					update_time = :updateTime
				WHERE id = :id AND delete_time IS NULL
			`,
			{
				id: params.id,
				name: params.name,
				remark: params.remark,
				permissions: params.permissions ? JSON.stringify(params.permissions) : void 0,
				isEnabled: params.isEnabled,
				expireTime: params.expireTime,
				updateTime: new Date()
			}
		)
	}

	/** 重置 API 客户端密钥, 同时轮换密钥标识与哈希, 使旧密钥立即失效 */
	resetKey(p: ResetApiClientKeyParams) {
		const { id, keyId, keyHash } = resetApiClientKeyParamsSchema.parse(p)
		return this.query<void>(
			'void',
			/* sql */ `
				UPDATE ${tableName}
				SET key_id = :keyId, key_hash = :keyHash, update_time = :updateTime
				WHERE id = :id AND delete_time IS NULL
			`,
			{ id, keyId, keyHash, updateTime: new Date() }
		)
	}

	/** 获取 API 客户端(不含密钥字段) */
	async get(p: GetApiClientParams): Promise<ApiClient> {
		const { id } = getApiClientParamsSchema.parse(p)
		const info = await this.query<ApiClient>(
			'info',
			/* sql */ `
				SELECT id, name, remark, permissions, is_enabled AS isEnabled, expire_time AS expireTime,
					create_time AS createTime, update_time AS updateTime
				FROM ${tableName}
				WHERE id = :id AND delete_time IS NULL
			`,
			{ id }
		)
		return info ? this.normalize(info) : info
	}

	/** 根据密钥标识获取鉴权信息(含密钥哈希), 供 openApi 校验使用 */
	async getAuthByKeyId(p: GetApiClientByKeyIdParams): Promise<ApiClientAuth> {
		const { keyId } = getApiClientByKeyIdParamsSchema.parse(p)
		const info = await this.query<ApiClientAuth>(
			'info',
			/* sql */ `
				SELECT id, name, permissions, is_enabled AS isEnabled, expire_time AS expireTime, key_hash AS keyHash
				FROM ${tableName}
				WHERE key_id = :keyId AND delete_time IS NULL
			`,
			{ keyId }
		)
		if (!info) return info
		info.isEnabled = !!info.isEnabled
		info.permissions = apiClientPermissionsSchema.parse(info.permissions ?? {})
		return info
	}

	/** 获取 API 客户端列表(不含密钥字段) */
	async getList(p: GetApiClientListParams): Promise<ApiClient[]> {
		const params = getApiClientListParamsSchema.parse(p)
		const list = await this.query<ApiClient[]>(
			'list',
			/* sql */ `
				SELECT id, name, remark, permissions, is_enabled AS isEnabled, expire_time AS expireTime,
					create_time AS createTime, update_time AS updateTime
				FROM ${tableName}
				WHERE ${this.ifNotVoid(params.name, `name LIKE concat('%', :name, '%') AND`)}
					delete_time IS NULL
				ORDER BY id DESC
				${this.ifel(params.page && params.size, 'LIMIT :page, :size')}
			`,
			{
				...params,
				page: params.page && params.size ? (params.page - 1) * params.size : void 0,
				size: params.size
			}
		)
		return list.map((info) => this.normalize(info))
	}

	/** 获取 API 客户端数量 */
	getCount(p: GetApiClientListCountParams) {
		const params = getApiClientListCountParamsSchema.parse(p)
		return this.query<{ count: number }>(
			'info',
			/* sql */ `
				SELECT COUNT(*) AS count FROM ${tableName}
				WHERE ${this.ifNotVoid(params.name, `name LIKE concat('%', :name, '%') AND`)}
					delete_time IS NULL
			`,
			params
		)
	}

	/** 规范化数据库返回值: tinyint 转 boolean、权限与授权目录补全默认值 */
	private normalize(info: ApiClient): ApiClient {
		return {
			...info,
			isEnabled: !!info.isEnabled,
			permissions: apiClientPermissionsSchema.parse(info.permissions ?? {}),
		}
	}
}
