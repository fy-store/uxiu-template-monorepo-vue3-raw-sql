import type { PromiseReturn } from './utils/type'
import type { MyInfo, LoginParams, UpdateMyPasswordParams } from '@server/api/v1/account'
import type { Authority } from '@server/api/v1/authority'
import { request } from './utils'

/** 管理员登录 */
export function loginAdmin(p: LoginParams): PromiseReturn<{ token: string; name: string }> {
	return request.post('login/admin', p)
}

/** 退出登录, 注销当前 token */
export function logout(): PromiseReturn {
	return request.post('logout')
}

/** 获取当前账号信息 */
export function myInfo(): PromiseReturn<MyInfo> {
	return request.get('myInfo')
}

/** 修改当前账号密码 */
export function updateMyPassword(p: UpdateMyPasswordParams): PromiseReturn<void> {
	return request.post('updateMyPassword', p)
}

/** 获取权限选择器 */
export function authoritySelect(): PromiseReturn<Authority[]> {
	return request.get('authoritySelect')
}
