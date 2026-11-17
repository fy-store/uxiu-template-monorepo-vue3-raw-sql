import type { z } from 'zod'
import type { adminConfigValueSchema, getAdminConfigParamsSchema, upsertAdminConfigParamsSchema } from './schema'

export type AdminConfigValue = z.infer<typeof adminConfigValueSchema>
export type GetAdminConfigParams = z.infer<typeof getAdminConfigParamsSchema>
export type UpsertAdminConfigParams = z.infer<typeof upsertAdminConfigParamsSchema>

export interface AdminConfig {
	id: number
	adminId: number
	value: AdminConfigValue
	createTime: string
	updateTime: string | null
}
