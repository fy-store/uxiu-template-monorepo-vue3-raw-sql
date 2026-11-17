import { z } from 'zod'
import { isEffectiveStrNumber } from 'uxiu'

/** API 客户端权限参数 */
export const apiClientPermissionsSchema = z.object({
	create: z.boolean('创建权限类型有误').default(false),
	read: z.boolean('查询权限类型有误').default(false),
	update: z.boolean('修改权限类型有误').default(false),
	delete: z.boolean('删除权限类型有误').default(false)
})

/** 过期时间参数, 支持时间戳/日期字符串, 传 null 或空字符串表示永久有效 */
const expireTimeSchema = z.preprocess((v) => {
	if (v === null || v === '') return null
	if (v === undefined) return undefined
	if (typeof v === 'number' || typeof v === 'string') {
		const date = new Date(v)
		return Number.isNaN(date.getTime()) ? v : date
	}
	return v
}, z.date('过期时间格式有误').nullable())

const nameSchema = z.string('名称类型有误').trim().min(1, '名称不能为空').max(50, '名称长度不能超过 50')
const remarkSchema = z.string('备注类型有误').trim().max(500, '备注长度不能超过 500')

/** 创建 API 客户端参数 */
export const createApiClientParamsSchema = z.object({
	name: nameSchema,
	remark: remarkSchema.optional(),
	permissions: apiClientPermissionsSchema,
	isEnabled: z.boolean('是否启用类型有误').optional(),
	expireTime: expireTimeSchema.optional()
})

/** 更新 API 客户端参数 */
export const updateApiClientParamsSchema = z.object({
	id: z.int('ID 必须是整数').min(1, 'ID 必须大于 0'),
	name: nameSchema.optional(),
	remark: remarkSchema.optional(),
	permissions: apiClientPermissionsSchema.optional(),
	isEnabled: z.boolean('是否启用类型有误').optional(),
	expireTime: expireTimeSchema.optional()
})

/** 重置 API 客户端密钥参数 */
export const resetApiClientKeyParamsSchema = z.object({
	id: z.int('ID 必须是整数').min(1, 'ID 必须大于 0')
})

/** 删除 API 客户端参数 */
export const deleteApiClientParamsSchema = z.object({
	id: z.int('ID 必须是整数').min(1, 'ID 必须大于 0')
})

/** 获取 API 客户端列表参数 */
export const getApiClientListParamsSchema = z.object({
	page: z.preprocess(
		(v, ctx) => {
			if (!isEffectiveStrNumber(v as string)) {
				ctx.addIssue({
					code: 'invalid_type',
					expected: 'int',
					message: '页码类型有误'
				})
			}
			return Number(v)
		},
		z.int('页码必须是整数').min(1, '页码必须大于等于 1')
	),
	size: z.preprocess(
		(v, ctx) => {
			if (!isEffectiveStrNumber(v as string)) {
				ctx.addIssue({
					code: 'invalid_type',
					expected: 'int',
					message: '每页数量类型有误'
				})
			}
			return Number(v)
		},
		z.int('每页数量必须是整数').min(1, '每页数量必须大于等于 1').max(1000, '每页数量不能超过 1000')
	),
	name: z.string('名称类型有误').trim().optional()
})
