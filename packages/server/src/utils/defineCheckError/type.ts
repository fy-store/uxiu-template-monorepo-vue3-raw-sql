import { z } from 'zod'

export interface CustomErrorInfo {
	code: 1
	msg: string
	issues?: z.core.$ZodIssue[]
}
