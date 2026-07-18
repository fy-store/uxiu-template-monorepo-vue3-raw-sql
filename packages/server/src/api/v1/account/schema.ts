import { z } from 'zod'

/** 登录参数 */
export const loginParamsSchema = z.object({
	account: z.string('账号类型有误').trim().min(1, '账号不能为空').max(20, '账号长度不能超过20个字符'),
	password: z.string('密码类型有误').trim().min(1, '密码不能为空').max(20, '密码长度不能超过20个字符')
})
