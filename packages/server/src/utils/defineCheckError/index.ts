import type { CustomErrorInfo } from './type'
import { z } from 'zod'
export type * from './type'

/**
 * 包装 zodError
 * - 开发环境保留 issues
 * - 生产环境删除 issues
 * - 返回示例: `{ code: 1, msg: '错误信息', issues?: [] }`
 * @param zodError
 */
export function defineCheckError(zodError: z.ZodError) {
	if (!(zodError instanceof z.ZodError)) {
		throw new Error('Expected a ZodError instance')
	}

	const info: CustomErrorInfo = {
		code: 1,
		msg: zodError.issues.map((iss) => iss.message).join('、')
	}

	if (process.env.NODE_ENV === 'development') {
		info.issues = zodError.issues
	}

	return info
}
