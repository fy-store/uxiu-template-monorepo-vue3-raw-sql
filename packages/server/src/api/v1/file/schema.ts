import { isEffectiveStrNumber } from 'uxiu'
import { z } from 'zod'

/** 普通文件上传参数 */
export const uploadFileParamsSchema = z.object({
	/** 文件名称 */
	name: z.string('文件名称类型有误').trim().min(1, '文件名称长度不能小于 1').max(200, '文件名称长度不能大于 200'),
	/** 目录ID */
	parentId: z
		.preprocess(
			(v, ctx) => {
				if (!isEffectiveStrNumber(v as string)) {
					ctx.addIssue({
						code: 'invalid_type',
						expected: 'int',
						message: '目录ID类型有误'
					})
				}
				return Number(v)
			},
			z.number('目录ID类型有误').int('目录ID必须是整数').min(0, '目录ID必须大于等于 0')
		)
		.optional(),
	isPrivate: z.preprocess((v, ctx) => {
		if (v === void 0) {
			return false
		}
		if (v === 'true') {
			return true
		}
		if (v === 'false') {
			return false
		}
		ctx.addIssue({
			code: 'invalid_type',
			expected: 'boolean',
			message: '是否私有类型有误'
		})
	}, z.boolean('是否私有类型有误').optional()),
	/** 是否加密 */
	isEncrypted: z.preprocess((v, ctx) => {
		if (v === void 0) {
			return false
		}
		if (v === 'true') {
			return true
		}
		if (v === 'false') {
			return false
		}
		ctx.addIssue({
			code: 'invalid_type',
			expected: 'boolean',
			message: '是否私有类型有误'
		})
	}, z.boolean('是否加密类型有误').optional()),
	/** 加密文件元信息 */
	meta: z.string('文件元信息类型有误').max(10000, '文件元信息长度不能大于 10000').optional(),
	/** 备注 */
	remark: z.string('备注类型有误').max(200, '备注长度不能大于 200').optional()
})
