import type { z } from 'zod'
import type { updatePersonalizationParamsSchema } from './schema'

/** 个性化配置 */
export interface Personalization {
	/** 主题 ID */
	themeId: string
}

export type UpdatePersonalizationParams = z.infer<typeof updatePersonalizationParamsSchema>
