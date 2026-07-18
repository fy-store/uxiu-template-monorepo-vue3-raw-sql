import type { DefaultSysConfig } from './types'
import { defaultSysConfigSchema } from './schema'
export type * from './types'

/**
 * 定义系统配置参数
 * - 支持直接在对象字面量中追加额外字段 (通过 Extra 泛型推断)
 */
export function definedSysConfig<const Extra extends Record<string, any> = {}>(
	config: DefaultSysConfig & Extra
): DefaultSysConfig & Extra {
	const result = defaultSysConfigSchema.safeParse(config)
	if (!result.success) throw result.error
	return config as DefaultSysConfig & Extra
}
