import type { AliOSS } from '../AliOSS'

/** 上传文件的可信描述信息。 */
export interface AliOSSUploadFileOptions {
	filename: string
	fileSize: number
	contentType?: string
	lastModified?: number
}

/** 初始化 Multipart Upload 时使用的文件和分片信息。 */
export interface AliOSSUploadPrepareOptions extends AliOSSUploadFileOptions {
	partSize: number
	/** 当前用户范围内稳定且唯一的续传标识。 */
	resumeKey?: string
}

/** 后端需要持久化的 Multipart Upload 会话。 */
export interface AliOSSUploadSession<TOwnerId = string | number> extends AliOSSUploadPrepareOptions {
	ownerId: TOwnerId
	uploadId: string
	storageFilename: string
	uploadPath: string
	objectName: string
	createdAt: number
	updatedAt: number
}

/**
 * 上传会话存储适配器。
 *
 * 可以使用内置内存实现，也可以接入数据库、Redis 或其他持久化服务。
 */
export interface AliOSSUploadSessionStorage<TOwnerId = string | number> {
	getByUploadId(
		ownerId: TOwnerId,
		uploadId: string
	): Promise<AliOSSUploadSession<TOwnerId> | undefined>
	getByResumeKey(
		ownerId: TOwnerId,
		resumeKey: string
	): Promise<AliOSSUploadSession<TOwnerId> | undefined>
	save(session: AliOSSUploadSession<TOwnerId>): Promise<void>
	delete(session: AliOSSUploadSession<TOwnerId>): Promise<void>
}

export interface AliOSSUploadPathInfo<TOwnerId = string | number> extends AliOSSUploadFileOptions {
	ownerId: TOwnerId
}

export type AliOSSUploadPathResolver<TOwnerId = string | number> =
	| string
	| ((info: AliOSSUploadPathInfo<TOwnerId>) => string)

/** 创建后端上传管理器时使用的配置。 */
export interface AliOSSUploadManagerOptions<TOwnerId = string | number> {
	/** 已配置好 Bucket 和凭证的 OSS 工具实例。 */
	oss: AliOSS
	/** 上传会话存储；生产环境建议使用数据库或 Redis 实现。 */
	storage: AliOSSUploadSessionStorage<TOwnerId>
	/** 普通上传 Object 目录，默认 `uploads/simple`。 */
	simpleUploadPath?: AliOSSUploadPathResolver<TOwnerId>
	/** 分片上传 Object 目录，默认 `uploads/multipart`。 */
	multipartUploadPath?: AliOSSUploadPathResolver<TOwnerId>
	/** PUT 预签名 URL 有效期，单位秒，默认 15 分钟。 */
	signatureExpires?: number
	/** GET 访问 URL 有效期，单位秒，默认 1 小时。 */
	accessExpires?: number
	/** 自定义 OSS 存储文件名；默认使用 UUID 并保留安全扩展名。 */
	createStorageFilename?: (filename: string) => string
}

export interface AliOSSUploadSimpleSignatureResult {
	url: string
	accessUrl: string
	headers: Record<string, string>
	objectName: string
}

export interface AliOSSUploadPrepareResult<TOwnerId = string | number> {
	session: AliOSSUploadSession<TOwnerId>
	partCount: number
	reused: boolean
}
