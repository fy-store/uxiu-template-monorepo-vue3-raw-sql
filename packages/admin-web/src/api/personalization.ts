import type { PromiseReturn } from './utils/type'
import type { Personalization, UpdatePersonalizationParams } from '@server/api/v1/personalization'
import { request } from './utils'

/** 获取当前账号个性化配置 */
export function getMine(): PromiseReturn<Personalization | null> {
	return request.get('personalization/my')
}

/** 保存当前账号个性化配置 */
export function updateMine(params: UpdatePersonalizationParams): PromiseReturn {
	return request.post('personalization/update', params)
}
