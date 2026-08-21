import path from 'node:path'
import dayjs from 'dayjs'
import type { AliOSSMultipartPart } from '../AliOSS'
import type {
	AliOSSUploadFileOptions,
	AliOSSUploadManagerOptions,
	AliOSSUploadPathResolver,
	AliOSSUploadPrepareOptions,
	AliOSSUploadSession
} from './types'

export * from './types'
export * from './memoryStorage'

const DEFAULT_SIMPLE_UPLOAD_PATH = 'uploads/simple'
const DEFAULT_MULTIPART_UPLOAD_PATH = 'uploads/multipart'
const DEFAULT_SIGNATURE_EXPIRES = 15 * 60
const DEFAULT_ACCESS_EXPIRES = 60 * 60
const MAX_MULTIPART_PART_SIZE = 5 * 1024 ** 3
const MAX_MULTIPART_PART_COUNT = 10000

/** 上传会话不存在或不属于当前所有者。 */
export class AliOSSUploadSessionNotFoundError extends Error {
	constructor(message = '上传会话不存在、已完成或不属于当前用户') {
		super(message)
		this.name = 'AliOSSUploadSessionNotFoundError'
	}
}

/** 上传会话与当前文件或 OSS 分片状态冲突。 */
export class AliOSSUploadSessionConflictError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'AliOSSUploadSessionConflictError'
	}
}

/**
 * 服务端 OSS 预签名上传管理器。
 *
 * 统一处理 Object 命名、普通上传签名、Multipart 会话、分片签名、可信校验、合并和取消；
 * 业务只需要提供 OSS 实例和会话存储适配器。
 */
export class AliOSSUploadManager<TOwnerId = string | number> {
	private readonly options: Required<
		Pick<AliOSSUploadManagerOptions<TOwnerId>, 'signatureExpires' | 'accessExpires' | 'createStorageFilename'>
	> &
		AliOSSUploadManagerOptions<TOwnerId>

	/** 创建上传管理器。 */
	constructor(options: AliOSSUploadManagerOptions<TOwnerId>) {
		if (!options?.oss) throw new TypeError('options.oss is required')
		if (!options.storage) throw new TypeError('options.storage is required')
		this.options = {
			...options,
			signatureExpires: options.signatureExpires ?? DEFAULT_SIGNATURE_EXPIRES,
			accessExpires: options.accessExpires ?? DEFAULT_ACCESS_EXPIRES,
			createStorageFilename: options.createStorageFilename ?? this.createStorageFilename
		}
	}

	/** 为普通 PUT 上传生成唯一 Object、上传 URL 和访问 URL。 */
	async createSimpleUploadSignature(ownerId: TOwnerId, file: AliOSSUploadFileOptions) {
		const storageFilename = this.options.createStorageFilename(file.filename)
		const uploadPath = this.resolveUploadPath(
			this.options.simpleUploadPath ?? DEFAULT_SIMPLE_UPLOAD_PATH,
			ownerId,
			file
		)
		const headers = file.contentType ? { 'Content-Type': file.contentType } : undefined
		const url = await this.options.oss.generateUploadSignatureUrl({
			filename: storageFilename,
			uploadPath,
			fileSize: file.fileSize,
			expires: this.options.signatureExpires,
			headers
		})
		const accessUrl = await this.options.oss.generateAccessSignatureUrl({
			filename: storageFilename,
			uploadPath,
			expires: this.options.accessExpires
		})
		return {
			url,
			accessUrl,
			headers: headers ?? {},
			objectName: uploadPath ? `${uploadPath}/${storageFilename}` : storageFilename
		}
	}

	/** 创建 Multipart Upload，或按当前所有者和 resumeKey 返回已有会话。 */
	async prepare(ownerId: TOwnerId, file: AliOSSUploadPrepareOptions) {
		this.validatePrepareOptions(file)
		const existingSession = file.resumeKey
			? await this.options.storage.getByResumeKey(ownerId, file.resumeKey)
			: undefined
		if (existingSession) {
			if (!this.isSameFile(existingSession, file)) {
				throw new AliOSSUploadSessionConflictError('resumeKey 已被其他文件使用，请更换文件标识')
			}
			existingSession.updatedAt = Date.now()
			await this.options.storage.save(existingSession)
			return { session: existingSession, partCount: this.getPartCount(existingSession), reused: true }
		}

		const storageFilename = this.options.createStorageFilename(file.filename)
		const uploadPath = this.resolveUploadPath(
			this.options.multipartUploadPath ?? DEFAULT_MULTIPART_UPLOAD_PATH,
			ownerId,
			file
		)
		const headers = file.contentType ? { 'Content-Type': file.contentType } : undefined
		const initialized = await this.options.oss.initMultipartUpload({ filename: storageFilename, uploadPath, headers })
		const now = Date.now()
		const session: AliOSSUploadSession<TOwnerId> = {
			...file,
			ownerId,
			uploadId: initialized.uploadId,
			storageFilename,
			uploadPath,
			objectName: initialized.objectName,
			createdAt: now,
			updatedAt: now
		}

		try {
			await this.options.storage.save(session)
		} catch (error) {
			try {
				await this.options.oss.abortMultipartUpload(session.objectName, session.uploadId)
			} catch (cleanupError) {
				throw new AggregateError([error, cleanupError], '保存上传会话和清理 OSS Multipart Upload 均失败')
			}
			throw error
		}

		return { session, partCount: this.getPartCount(session), reused: false }
	}

	/** 获取属于当前所有者的会话，并刷新最后访问时间。 */
	async getSession(ownerId: TOwnerId, uploadId: string) {
		const session = await this.options.storage.getByUploadId(ownerId, uploadId)
		if (!session) throw new AliOSSUploadSessionNotFoundError()
		session.updatedAt = Date.now()
		await this.options.storage.save(session)
		return session
	}

	/** 从 OSS 查询当前会话已上传的全部分片。 */
	async listParts(ownerId: TOwnerId, uploadId: string) {
		const session = await this.getSession(ownerId, uploadId)
		return this.options.oss.listMultipartUploadParts(session.objectName, session.uploadId)
	}

	/** 只为指定分片生成新的短期 PUT 预签名 URL。 */
	async signParts(ownerId: TOwnerId, uploadId: string, partNumbers: number[]) {
		const session = await this.getSession(ownerId, uploadId)
		const partCount = this.getPartCount(session)
		return Promise.all(
			partNumbers.map(async (partNumber) => {
				if (partNumber < 1 || partNumber > partCount) {
					throw new RangeError(`分片编号 ${partNumber} 超出 1 至 ${partCount} 的范围`)
				}
				return {
					partNumber,
					url: await this.options.oss.generateUploadPartSignatureUrl({
						filename: session.storageFilename,
						uploadPath: session.uploadPath,
						fileSize: this.getPartSize(session, partNumber),
						uploadId: session.uploadId,
						partNumber,
						expires: this.options.signatureExpires
					})
				}
			})
		)
	}

	/** 从 OSS 重新校验全部分片并完成合并。 */
	async complete(ownerId: TOwnerId, uploadId: string) {
		const session = await this.getSession(ownerId, uploadId)
		const parts = await this.options.oss.listMultipartUploadParts(session.objectName, session.uploadId)
		this.validateCompleteParts(session, parts)
		const result = await this.options.oss.completeMultipartUpload(session.objectName, session.uploadId, parts)
		const accessUrl = await this.options.oss.generateAccessSignatureUrl({
			filename: session.storageFilename,
			uploadPath: session.uploadPath,
			expires: this.options.accessExpires
		})
		await this.options.storage.delete(session)
		return { ...result, accessUrl }
	}

	/** 永久取消 Multipart Upload 并删除会话；会话不存在时返回 false。 */
	async abort(ownerId: TOwnerId, uploadId: string) {
		const session = await this.options.storage.getByUploadId(ownerId, uploadId)
		if (!session) return false
		try {
			await this.options.oss.abortMultipartUpload(session.objectName, session.uploadId)
		} finally {
			await this.options.storage.delete(session)
		}
		return true
	}

	/** 根据文件大小和分片大小计算总分片数。 */
	getPartCount(session: Pick<AliOSSUploadSession<TOwnerId>, 'fileSize' | 'partSize'>) {
		return Math.ceil(session.fileSize / session.partSize)
	}

	private getPartSize(session: AliOSSUploadSession<TOwnerId>, partNumber: number) {
		const start = (partNumber - 1) * session.partSize
		return Math.min(session.partSize, session.fileSize - start)
	}

	private validatePrepareOptions(file: AliOSSUploadPrepareOptions) {
		if (!Number.isSafeInteger(file.fileSize) || file.fileSize < 1) {
			throw new RangeError('fileSize must be a positive safe integer')
		}
		if (!Number.isSafeInteger(file.partSize) || file.partSize < 1 || file.partSize > MAX_MULTIPART_PART_SIZE) {
			throw new RangeError(`partSize must be an integer between 1 and ${MAX_MULTIPART_PART_SIZE}`)
		}
		if (Math.ceil(file.fileSize / file.partSize) > MAX_MULTIPART_PART_COUNT) {
			throw new RangeError(`multipart upload cannot exceed ${MAX_MULTIPART_PART_COUNT} parts`)
		}
		if (file.resumeKey !== undefined && (typeof file.resumeKey !== 'string' || file.resumeKey.trim().length === 0)) {
			throw new TypeError('resumeKey must be a non-empty string')
		}
	}

	private validateCompleteParts(session: AliOSSUploadSession<TOwnerId>, parts: AliOSSMultipartPart[]) {
		const partCount = this.getPartCount(session)
		if (parts.length !== partCount) {
			throw new AliOSSUploadSessionConflictError(`分片不完整，当前 ${parts.length}/${partCount}`)
		}
		for (let index = 0; index < parts.length; index++) {
			const part = parts[index]
			const expectedPartNumber = index + 1
			if (part.partNumber !== expectedPartNumber) {
				throw new AliOSSUploadSessionConflictError(`缺少分片 ${expectedPartNumber}`)
			}
			if (part.size !== this.getPartSize(session, part.partNumber)) {
				throw new AliOSSUploadSessionConflictError(`分片 ${part.partNumber} 大小不正确`)
			}
		}
	}

	private resolveUploadPath(
		resolver: AliOSSUploadPathResolver<TOwnerId>,
		ownerId: TOwnerId,
		file: AliOSSUploadFileOptions
	) {
		return typeof resolver === 'function' ? resolver({ ownerId, ...file }) : resolver
	}

	private isSameFile(session: AliOSSUploadSession<TOwnerId>, file: AliOSSUploadPrepareOptions) {
		return (
			session.filename === file.filename &&
			session.fileSize === file.fileSize &&
			session.contentType === file.contentType &&
			session.lastModified === file.lastModified
		)
	}

	private createStorageFilename(filename: string) {
		const extension = path
			.extname(filename)
			.toLowerCase()
			.replace(/[^.a-z0-9]/g, '')
			.slice(0, 20)
		return `${globalThis.crypto.randomUUID()}-${dayjs.unix(Date.now())}${extension}`
	}
}
