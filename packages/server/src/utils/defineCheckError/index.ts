import type { CustomErrorInfo } from './type'
import { z } from 'zod'
export type * from './type'

/**
 * 包装 zodError、Error、string
 * - 开发环境保留 issues, 生产环境删除 issues; Error、string 类型没有 issues
 * - 返回示例: `{ code: 1, msg: '错误信息', issues?: [] }`
 * @param error
 */
export function defineCheckError(error: z.ZodError | Error | string): CustomErrorInfo {
	if (error instanceof z.ZodError) {
		const info: CustomErrorInfo = {
			code: 1,
			msg: error.issues.map((iss) => iss.message).join('、')
		}

		if (process.env.NODE_ENV === 'development') {
			info.issues = error.issues
		}

		return info
	} else if (error instanceof Error) {
		return {
			code: 1,
			msg: error.message
		}
	} else {
		return {
			code: 1,
			msg: String(error)
		}
	}
}
