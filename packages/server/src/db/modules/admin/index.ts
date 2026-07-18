import type { AdminAll, Admin, CreateAdminParams, GetAdminListParams, UpdateAdminParams } from './types'
import { DbFit } from '@server/db/connect'
import { tableMap } from '@server/config'
export * from './types'

const admin = tableMap.admin
export class DbAdmin extends DbFit {
	create(p: CreateAdminParams) {
		return this.query<void>(
			'void',
			/*sql*/ `
            	INSERT INTO ${admin.tableName} (name, account, password, is_super, authority, remark)
            	VALUES (:name, :account, :password, :isSuper, :authority, :remark)
        	`,
			{
				...p,
				authority: JSON.stringify(p.authority ?? [])
			}
		)
	}

	del(id: number) {
		return this.query<void>(
			'void',
			/*sql*/ `
				UPDATE ${admin.tableName} SET delete_time = :deleteTime WHERE id = :id AND delete_time IS NULL
		`,
			{ id, deleteTime: new Date() }
		)
	}

	update(p: UpdateAdminParams) {
		return this.query<void>(
			'void',
			/*sql*/ `
				UPDATE ${admin.tableName} SET
					${this.ifNotVoid(p.name, 'name = :name,')}
					${this.ifNotVoid(p.password, 'password = :password,')}
					${this.ifNotVoid(p.isSuper, 'is_super = :isSuper,')}
					${this.ifNotVoid(p.authority, 'authority = :authority,')}
					${this.ifNotVoid(p.remark, 'remark = :remark,')}
					update_time = :updateTime
				WHERE id = :id AND delete_time IS NULL
			`,
			{
				...p,
				authority: p.authority ? JSON.stringify(p.authority) : void 0,
				updateTime: new Date()
			}
		)
	}

	async get(id: number, allInfo?: boolean): Promise<Admin>
	async get(id: number, allInfo: true): Promise<AdminAll>
	async get(id: number, allInfo?: boolean): Promise<Admin> {
		const info = await this.query(
			'info',
			/*sql*/ `
            	SELECT id, name, account, authority, create_time AS createTime
            		${this.ifel(allInfo, ', is_super as isSuper, password, remark, update_time AS updateTime')}
            	FROM ${admin.tableName}
            	WHERE id = :id AND delete_time IS NULL
        	`,
			{ id }
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
		const info = await this.query(
			'info',
			/*sql*/ `
            	SELECT id, name, account, authority, create_time AS createTime
            		${this.ifel(allInfo, ', is_super as isSuper, remark, update_time AS updateTime')}
            	FROM ${admin.tableName}
            	WHERE id = :id AND delete_time IS NULL
        	`,
			{ id }
		)
		if (info && allInfo) {
			info.isSuper = !!info.isSuper
		}
		return info
	}

	async getByAccount(account: string, allInfo?: boolean): Promise<Admin>
	async getByAccount(account: string, allInfo: true): Promise<AdminAll>
	async getByAccount(account: string, allInfo?: boolean): Promise<Admin> {
		const info = await this.query(
			'info',
			/*sql*/ `
            	SELECT id, name, account, authority, create_time AS createTime
            		${this.ifel(allInfo, ', is_super as isSuper, password, remark, update_time AS updateTime')}
            	FROM ${admin.tableName}
            	WHERE account = :account AND delete_time IS NULL
        	`,
			{ account }
		)
		if (info && allInfo) {
			info.isSuper = !!info.isSuper
		}
		return info
	}

	async getList(p: GetAdminListParams, allInfo?: boolean): Promise<Admin[]>
	async getList(p: GetAdminListParams, allInfo: true): Promise<Omit<AdminAll, 'password'>[]>
	async getList(p: GetAdminListParams, allInfo?: boolean): Promise<Admin[]> {
		const list: AdminAll[] = await this.query(
			'list',
			/*sql*/ `
            	SELECT id, name, account, authority, create_time AS createTime
            		${this.ifel(allInfo, ', is_super as isSuper, remark, update_time AS updateTime')}
            	FROM ${admin.tableName}
            	WHERE ${this.ifNotVoid(p.name, `name LIKE concat('%', :name, '%') AND`)} 
					${this.ifNotVoid(p.account, `account LIKE concat('%', :account, '%') AND`)}
					delete_time IS NULL
            	${this.ifel(p.page && p.size, `LIMIT :page, :size`)}
        	`,
			{ ...p, page: p.page && p.size ? (p.page - 1) * p.size : void 0, size: p.size }
		)
		list.forEach((it) => {
			if (it?.isSuper !== void 0) {
				it.isSuper = !!it.isSuper
			}
		})
		return list
	}

	getCount(p: Omit<GetAdminListParams, 'page' | 'size'>) {
		return this.query<{ count: number }>(
			'info',
			/*sql*/ `
            	SELECT COUNT(*) as count FROM ${admin.tableName}
            	WHERE ${this.ifNotVoid(p.name, `name LIKE concat('%', :name, '%') AND`)} 
					${this.ifNotVoid(p.account, `account LIKE concat('%', :account, '%') AND`)} 
					delete_time IS NULL
        	`,
			p
		)
	}
}
