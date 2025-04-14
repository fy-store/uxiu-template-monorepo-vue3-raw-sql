import type { Return } from './utils/type'
import type { Login, MyInfo } from '@t/index'
import { request } from './utils/request'

/** 登录 */
export const login = (data: Login): Promise<Return> => request.post('login', data)

/** 获取用户当前信息 */
export const getMyInfo = (): Promise<Return<MyInfo>> => request.get('getMyInfo')
