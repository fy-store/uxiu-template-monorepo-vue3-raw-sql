import { z } from 'zod'

/** 登录参数 */
export const loginParamsSchema = z.object({
	account: z.string('账号类型有误').trim().min(1, '账号不能为空').max(20, '账号长度不能超过20个字符'),
	password: z.string('密码类型有误').trim().min(1, '密码不能为空').max(20, '密码长度不能超过20个字符')
})

/** 修改当前账号密码参数 */
export const updateMyPasswordParamsSchema = z.object({
	oldPassword: z.string('原密码类型有误').trim().min(1, '请输入原密码').max(20, '密码长度不能超过 20 个字符'),
	newPassword: z
		.string('新密码类型有误')
		.trim()
		.min(6, '新密码长度不能少于 6 个字符')
		.max(20, '新密码长度不能超过 20 个字符')
})
