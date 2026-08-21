import type { AliOSSUploadSession, AliOSSUploadSessionStorage } from './types'

/** 内存会话存储配置。 */
export interface AliOSSUploadMemoryStorageOptions<TOwnerId> {
	/** 将 ownerId 转换成稳定 Map Key；默认使用 String(ownerId)。 */
	getOwnerKey?: (ownerId: TOwnerId) => string
}

/**
 * 适合开发和单进程演示的上传会话存储。
 *
 * 服务重启后数据会丢失，多实例之间也不会共享；生产环境应实现 AliOSSUploadSessionStorage。
 */
export class AliOSSUploadMemoryStorage<TOwnerId = string | number> implements AliOSSUploadSessionStorage<TOwnerId> {
	private readonly sessions = new Map<string, AliOSSUploadSession<TOwnerId>>()
	private readonly resumeSessions = new Map<string, string>()
	private readonly getOwnerKey: (ownerId: TOwnerId) => string

	constructor(options: AliOSSUploadMemoryStorageOptions<TOwnerId> = {}) {
		this.getOwnerKey = options.getOwnerKey ?? String
	}

	/** 按当前所有者和 UploadId 获取会话。 */
	async getByUploadId(ownerId: TOwnerId, uploadId: string) {
		const session = this.sessions.get(uploadId)
		if (!session || this.getOwnerKey(session.ownerId) !== this.getOwnerKey(ownerId)) return undefined
		return session
	}

	/** 按当前所有者和稳定续传标识获取会话。 */
	async getByResumeKey(ownerId: TOwnerId, resumeKey: string) {
		const uploadId = this.resumeSessions.get(this.createResumeKey(ownerId, resumeKey))
		return uploadId ? this.getByUploadId(ownerId, uploadId) : undefined
	}

	/** 新增或更新会话。 */
	async save(session: AliOSSUploadSession<TOwnerId>) {
		this.sessions.set(session.uploadId, session)
		if (session.resumeKey) {
			this.resumeSessions.set(this.createResumeKey(session.ownerId, session.resumeKey), session.uploadId)
		}
	}

	/** 删除会话及其续传索引。 */
	async delete(session: AliOSSUploadSession<TOwnerId>) {
		this.sessions.delete(session.uploadId)
		if (session.resumeKey) this.resumeSessions.delete(this.createResumeKey(session.ownerId, session.resumeKey))
	}

	private createResumeKey(ownerId: TOwnerId, resumeKey: string) {
		return `${this.getOwnerKey(ownerId)}:${resumeKey}`
	}
}
