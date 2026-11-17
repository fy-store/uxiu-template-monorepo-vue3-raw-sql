import { z } from 'zod'

/** 更新个性化配置参数校验 */
export const updatePersonalizationParamsSchema = z.object({
	themeId: z.string().trim().min(1).max(50)
})
