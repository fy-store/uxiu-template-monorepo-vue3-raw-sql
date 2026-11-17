import type { z } from 'zod'
import { identitySessionSchema, getSessionListParamsSchema } from './schema'

export type SessionValue = z.infer<typeof identitySessionSchema>
export type CreateSessionParams = SessionValue
export type UpdateSessionParams = SessionValue

export type GetSessionListParams = z.infer<typeof getSessionListParamsSchema>

export interface SessionInfo {
	id: string
	value: SessionValue
}
