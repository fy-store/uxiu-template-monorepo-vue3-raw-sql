import type { PromiseReturn } from './utils/type'
import type { CommonConfig, SystemConfigValue, UpdateSystemConfigParams } from '@server/api/v1/config'
import { request } from './utils'

/** 获取公共配置(未登录亦可获取) */
export function commonConfig(): PromiseReturn<CommonConfig> {
	return request.get('config/common')
}

/** 获取系统配置(管理员) */
export function systemConfig(): PromiseReturn<SystemConfigValue> {
	return request.get('config/systemConfig')
}

/** 保存系统配置(管理员) */
export function updateSystemConfig(params: UpdateSystemConfigParams): PromiseReturn {
	return request.post('config/updateSystemConfig', params)
}
