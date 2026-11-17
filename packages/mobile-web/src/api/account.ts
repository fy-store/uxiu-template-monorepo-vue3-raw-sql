import type { PromiseReturn } from './utils/type'
import type { MyInfo, LoginParams } from '@server/api/v1/account'
import type { Authority } from '@server/api/v1/authority'
import { request } from './utils'

/** 管理员登录 */
export function loginAdmin(p: LoginParams): PromiseReturn<{ token: string; name: string }> {
	return request.post('login/admin', p)
}

/** 用户登录 */
export function loginUser(p: LoginParams): PromiseReturn {
	return request.post('login/user', p)
}

/** 获取用户当前信息 */
export function myInfo(): PromiseReturn<MyInfo> {
	return request.get('myInfo')
}

/** 获取权限选择器 */
export function authoritySelect(): PromiseReturn<Authority[]> {
	return request.get('authoritySelect')
}
