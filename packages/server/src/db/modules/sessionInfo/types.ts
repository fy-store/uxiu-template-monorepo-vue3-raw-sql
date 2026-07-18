import type { IdentitySession } from '@server/config'

export type CreateSessionParams = IdentitySession
export type UpdateSessionParams = IdentitySession

export interface GetSessionListParams {
	page?: number
	size?: number
}

export interface SessionInfo {
	id: string
	value: IdentitySession
}
