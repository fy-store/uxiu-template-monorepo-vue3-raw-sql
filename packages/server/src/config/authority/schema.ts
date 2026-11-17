import { z } from 'zod'

/** 权限项元数据校验 */
export const authMetaSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1)
})

/** 序列化权限项校验 */
export const permissionItemSchema = z.object({
	methods: z
		.array(z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'TRACE', 'CONNECT']))
		.nullable(),
	path: z.string().nullable(),
	regex: z
		.object({
			source: z.string(),
			flags: z.string()
		})
		.nullable(),
	meta: authMetaSchema.optional()
})

/** 权限列表校验 */
export const permissionSchema = z.array(permissionItemSchema)
