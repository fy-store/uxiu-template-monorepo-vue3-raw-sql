import { execute } from '#dbConnect'
import { QueryUserSession, UserSession } from '#db'

const { userSession } = sys.conf.mysql.tables
export const getList = (params?: QueryUserSession): Promise<[UserSession[], any]> => {
	if (!params) {
		const sql = /*sql*/ `
		select session_id as sessionId, session_value as sessionValue from ${userSession.name} where delete_time is null
		`
		return execute.notLog(sql)
	}

	const sql = /*sql*/ `
	select session_id as sessionId, session_value as sessionValue from ${userSession.name} where delete_time is null limit ?, ?
	`
	return execute(sql, [(params.page - 1) * params.size, params.size])
}

export const getCount = (): Promise<[[{ count: number }], any]> => {
	const sql = /*sql*/ `
	select count(session_id) as count from ${userSession.name} where delete_time is null
	`
	return execute(sql)
}

type CreateParams = { sessionId: string; sessionValue: object }
export const create = (params: CreateParams) => {
	const sql = /*sql*/ `
    insert into ${userSession.name} (session_id, session_value) 
	values (?, ?)
    `
	return execute.notLog(sql, [params.sessionId, params.sessionValue])
}

export const deleteById = (id: number) => {
	const sql = /*sql*/ `
    update ${userSession.name} set delete_time = now() where id = ?
    `
	return execute.notLog(sql, [id])
}

export const deleteBySessionId = (sessionId: string) => {
	const sql = /*sql*/ `
    update ${userSession.name} set delete_time = now() where session_id = ?
    `
	return execute.notLog(sql, [sessionId])
}

type UpdateParams = { sessionId: string; sessionValue: object }

export const updateBySessionId = (params: UpdateParams) => {
	const sql = /*sql*/ `
    update ${userSession.name} set session_value = ? where session_id = ?
    `
	return execute.notLog(sql, [params.sessionValue, params.sessionId])
}
