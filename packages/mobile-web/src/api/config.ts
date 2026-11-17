import type { PromiseReturn } from './utils/type'
import type { CommonConfig } from '@server/api/v1/config'
import { request } from './utils'

/** 获取公共配置 */
export function commonConfig(): PromiseReturn<CommonConfig> {
	return request.get('config/common', {})
}
