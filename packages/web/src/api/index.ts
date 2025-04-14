import { request } from './utils/request'
import type { Return } from './utils/type'
// import type { QueryUserSession, UserSession } from '@t/index'

export * from './account'
export * from './admin'
export * from './authority'

// /** 获取用户会话列表 */
// export const getUserSessionList = (params: QueryUserSession): Promise<Return<{ count: number; list: UserSession[] }>> =>
// 	request.get('userSession', { params })

// /** 删除用户会话 */
// export const delUserSession = (id: string): Promise<Return> => request.delete(`userSession/${id}`)
