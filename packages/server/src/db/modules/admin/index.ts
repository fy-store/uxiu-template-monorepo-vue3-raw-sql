import type { Admin, AllInfoAdmin, QueryAdmin, QueryAdminCount, CreateAdmin, UpdateAdmin } from '#db'
import { execute } from '#dbConnect'
import { ifel } from '#utils'

const { admin } = $.sysConf.mysql.tables

export function getList(params: QueryAdmin): Promise<[Admin[], any]>
export function getList(params: QueryAdmin, allInfo: boolean): Promise<[AllInfoAdmin[], any]>
/** 获取管理员列表 */
export function getList(options: QueryAdmin, allInfo?: boolean) {
	const sql = /*sql*/ `
        select id, name, account, authority, create_time as createTime, update_time as updateTime
		${ifel(allInfo, ', is_super as isSuper, password')}
		from ${admin.name} 
		where ${ifel(options.name, "name like concat('%', ?, '%') and")} delete_time is null 
		order by id desc
		limit ?, ? 
    `
	if (options.name) {
		return execute(sql, [options.name, (options.page - 1) * options.size, options.size])
	}
	return execute(sql, [(options.page - 1) * options.size, options.size])
}

/** 获取管理员数量 */
export function getCount(params: QueryAdminCount): Promise<[[{ count: number }], any]> {
	const sql = /*sql*/ `
        select count(id) as count
		from ${admin.name} 
		where ${ifel(params.name, "name like concat('%', ?, '%') and")} delete_time is null 
		order by id desc
    `
	if (params.name) {
		return execute(sql, [params.name])
	}
	return execute(sql)
}

export function getById(id: number): Promise<[Admin[], any]>
export function getById(id: number, allInfo: boolean): Promise<[AllInfoAdmin[], any]>
/** 通过 `id` 获取管理员信息 */
export function getById(id: number, allInfo?: boolean) {
	const sql = /*sql*/ `
        select id, name, account, authority, create_time as createTime, update_time as updateTime 
		${ifel(allInfo, ', password, is_super as isSuper')}
		from ${admin.name} where id = ? and delete_time is null
    `
	return execute(sql, [id])
}

export function getByAccount(account: string): Promise<[Admin[], any]>
export function getByAccount(account: string, allInfo: boolean): Promise<[AllInfoAdmin[], any]>
/** 通过账号获取管理员信息 */
export function getByAccount(account: string, allInfo?: boolean) {
	const sql = /*sql*/ `
        select id, name, account, authority, create_time as createTime, update_time as updateTime 
		${ifel(allInfo, ', delete_time, password, is_super as isSuper')}
		from ${admin.name} where account = ? and delete_time is null
    `
	return execute(sql, [account])
}

/** 创建管理员 */
export function create(params: CreateAdmin) {
	const { name = '未命名', account, password, authority = [], isSuper = false } = params
	const sql = /*sql*/ `
        insert into ${admin.name} (name, account, password, authority, is_super) 
		values (?, ?, ?, ?, ?)
    `
	return execute(sql, [name, account, password, authority, isSuper])
}

/** 通过 `id` 删除管理员 */
export function deleteById(id: number) {
	const sql = /*sql*/ `
        update ${admin.name} set delete_time = now() where id = ? and delete_time is null
    `
	return execute(sql, [id])
}

export function updateById(id: number, params: UpdateAdmin) {
	const { name, password, authority, isSuper } = params

	const sql = /*sql*/ `
	update ${admin.name}
	set name = ?, password = ?, authority = ?, update_time = now(), is_super = ?
	where id = ? and delete_time is null
	`
	return execute(sql, [name, password, authority, isSuper, id])
}
