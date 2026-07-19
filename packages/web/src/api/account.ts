import type { Return } from './utils/type'
import type { MyInfo, LoginParams, Authority } from '@server/index'
import { request } from './utils'

/** 管理员登录 */
export const loginAdmin = (p: LoginParams): Promise<Return> => request.post('login/admin', p)

/** 用户登录 */
export const loginUser = (p: LoginParams): Promise<Return> => request.post('login/user', p)

/** 获取用户当前信息 */
export const getMyInfo = (): Promise<Return<MyInfo>> => request.get('getMyInfo')

/** 获取权限选择器 */
export const getAuthoritySelect = (): Promise<Return<Authority[]>> => request.get('getAuthoritySelect')
