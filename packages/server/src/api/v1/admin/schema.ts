import { z } from 'zod'
import { isEffectiveStrNumber } from 'uxiu'

/** 创建管理员参数 */
export const createAdminParamsSchema = z.object({
	account: z
		.string('账号类型有误')
		.trim()
		.min(3, '账号长度不能小于 3')
		.max(20, '账号长度不能超过 20')
		.regex(/^[a-zA-Z0-9_\-]+$/, '账号格式不正确'),
	password: z.string('密码类型有误').trim().min(5, '密码长度不能小于 5').max(20, '密码长度不能超过 20'),
	name: z.string('姓名类型有误').trim().min(1, '姓名长度不能小于 1').max(20, '姓名长度不能超过 20'),
	isSuper: z.boolean('是否超级管理员类型有误').optional(),
	authority: z.array(z.string('权限类型有误')),
	remark: z.string('备注类型有误').trim().max(500, '备注长度不能超过 500').optional()
})

/** 删除管理员参数 */
export const deleteAdminParamsSchema = z.object({
	id: z.int('ID 必须是整数').min(1, 'ID 必须大于 0')
})

/** 更新管理员参数 */
export const updateAdminParamsSchema = z.object({
	id: z.int('ID 必须是整数').min(1, 'ID 必须大于 0'),
	name: z.string('姓名类型有误').trim().min(1, '姓名长度不能小于 1').max(20, '姓名长度不能超过 20').optional(),
	password: z.string('密码类型有误').trim().min(5, '密码长度不能小于 5').max(20, '密码长度不能超过 20').optional(),
	/** 非超管修改无效 */
	isSuper: z.boolean('是否超级管理员类型有误').optional(),
	authority: z.array(z.string('权限类型有误')).optional(),
	remark: z.string('备注类型有误').trim().max(200, '备注长度不能超过 200').optional()
})

/** 获取管理员列表参数 */
export const getAdminListParamsSchema = z.object({
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
		z.int('页码必须是整数').min(0, '页码必须大于等于 0')
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
		z.int('每页数量必须是整数').min(0, '每页数量必须大于等于 0')
	),
	name: z.string('姓名类型有误').trim().optional()
})
