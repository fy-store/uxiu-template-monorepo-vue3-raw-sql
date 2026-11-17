import type { AdminAll, Admin, CreateAdminParams, GetAdminListParams, UpdateAdminParams } from './types'
import { DbFit, type BaseResult } from '@server/db/connect'
import { tableMap } from '@server/config'
import {
	createAdminParamsSchema,
	deleteAdminParamsSchema,
	getAdminByAccountParamsSchema,
	getAdminCountParamsSchema,
	getAdminListParamsSchema,
	getAdminParamsSchema,
	updateAdminParamsSchema
} from './schema'
export * from './types'

const admin = tableMap.admin
export class DbAdmin extends DbFit {
	create(p: CreateAdminParams) {
		const params = createAdminParamsSchema.parse(p)
		return this.query<BaseResult>(
			'insert',
			/*sql*/ `
            	INSERT INTO ${admin.tableName} (name, account, password, is_super, authority, remark)
            	VALUES (:name, :account, :password, :isSuper, :authority, :remark)
        	`,
			{
				...params,
				authority: JSON.stringify(params.authority)
			}
		)
	}

	del(id: number) {
		const params = deleteAdminParamsSchema.parse({ id })
		return this.query<void>(
			'void',
			/*sql*/ `
				UPDATE ${admin.tableName} SET delete_time = :deleteTime WHERE id = :id AND delete_time IS NULL
		`,
			{ ...params, deleteTime: new Date() }
		)
	}

	update(p: UpdateAdminParams) {
		const params = updateAdminParamsSchema.parse(p)
		return this.query<void>(
			'void',
			/*sql*/ `
				UPDATE ${admin.tableName} SET
					${this.ifNotVoid(params.name, 'name = :name,')}
					${this.ifNotVoid(params.password, 'password = :password,')}
					${this.ifNotVoid(params.isSuper, 'is_super = :isSuper,')}
					${this.ifNotVoid(params.authority, 'authority = :authority,')}
					${this.ifNotVoid(params.remark, 'remark = :remark,')}
					update_time = :updateTime
				WHERE id = :id AND delete_time IS NULL
			`,
			{
				...params,
				authority: params.authority ? JSON.stringify(params.authority) : void 0,
				updateTime: new Date()
			}
		)
	}

	async get(id: number, allInfo?: boolean): Promise<Admin>
	async get(id: number, allInfo: true): Promise<AdminAll>
	async get(id: number, allInfo?: boolean): Promise<Admin> {
		const params = getAdminParamsSchema.parse({ id })
		const info = await this.query(
			'info',
			/*sql*/ `
            	SELECT id, name, account, authority, create_time AS createTime
            		${this.ifel(allInfo, ', is_super as isSuper, password, remark, update_time AS updateTime')}
            	FROM ${admin.tableName}
            	WHERE id = :id AND delete_time IS NULL
        	`,
			params
		)
		if (info && allInfo) {
			info.isSuper = !!info.isSuper
		}
		return info
	}

	/** allInfo 也不包含密码, 为获取管理员基础信息专用 */
	async getInfo(id: number, allInfo?: boolean): Promise<Admin>
	/** allInfo 也不包含密码, 为获取管理员基础信息专用 */
	async getInfo(id: number, allInfo: true): Promise<Omit<AdminAll, 'password'>>
	/** allInfo 也不包含密码, 为获取管理员基础信息专用 */
	async getInfo(id: number, allInfo?: boolean): Promise<Admin> {
		const params = getAdminParamsSchema.parse({ id })
		const info = await this.query(
			'info',
			/*sql*/ `
            	SELECT id, name, account, authority, create_time AS createTime
            		${this.ifel(allInfo, ', is_super as isSuper, remark, update_time AS updateTime')}
            	FROM ${admin.tableName}
            	WHERE id = :id AND delete_time IS NULL
        	`,
			params
		)
		if (info && allInfo) {
			info.isSuper = !!info.isSuper
		}
		return info
	}

	async getByAccount(account: string, allInfo?: boolean): Promise<Admin>
	async getByAccount(account: string, allInfo: true): Promise<AdminAll>
	async getByAccount(account: string, allInfo?: boolean): Promise<Admin> {
		const params = getAdminByAccountParamsSchema.parse({ account })
		const info = await this.query(
			'info',
			/*sql*/ `
            	SELECT id, name, account, authority, create_time AS createTime
            		${this.ifel(allInfo, ', is_super as isSuper, password, remark, update_time AS updateTime')}
            	FROM ${admin.tableName}
            	WHERE account = :account AND delete_time IS NULL
        	`,
			params
		)
		if (info && allInfo) {
			info.isSuper = !!info.isSuper
		}
		return info
	}

	async getList(p: GetAdminListParams, allInfo?: boolean): Promise<Admin[]>
	async getList(p: GetAdminListParams, allInfo: true): Promise<Omit<AdminAll, 'password'>[]>
	async getList(p: GetAdminListParams, allInfo?: boolean): Promise<Admin[]> {
		const params = getAdminListParamsSchema.parse(p)
		const list: AdminAll[] = await this.query(
			'list',
			/*sql*/ `
            	SELECT id, name, account, authority, create_time AS createTime
            		${this.ifel(allInfo, ', is_super as isSuper, remark, update_time AS updateTime')}
            	FROM ${admin.tableName}
					WHERE ${this.ifNotVoid(params.name, `name LIKE concat('%', :name, '%') AND`)}
					${this.ifNotVoid(params.account, `account LIKE concat('%', :account, '%') AND`)}
					delete_time IS NULL
					${this.ifel(params.page && params.size, `LIMIT :page, :size`)}
        	`,
			{
				...params,
				page: params.page && params.size ? (params.page - 1) * params.size : void 0,
				size: params.size
			}
		)
		list.forEach((it) => {
			if (it?.isSuper !== void 0) {
				it.isSuper = !!it.isSuper
			}
		})
		return list
	}

	getCount(p: Omit<GetAdminListParams, 'page' | 'size'>) {
		const params = getAdminCountParamsSchema.parse(p)
		return this.query<{ count: number }>(
			'info',
			/*sql*/ `
            	SELECT COUNT(*) as count FROM ${admin.tableName}
					WHERE ${this.ifNotVoid(params.name, `name LIKE concat('%', :name, '%') AND`)}
					${this.ifNotVoid(params.account, `account LIKE concat('%', :account, '%') AND`)}
					delete_time IS NULL
        	`,
			params
		)
	}
}
