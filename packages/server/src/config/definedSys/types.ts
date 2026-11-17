import { z } from 'zod'
import { defaultSysConfigSchema } from './schema'

/** 默认系统配置参数 */
export type DefaultSysConfig = z.infer<typeof defaultSysConfigSchema>
