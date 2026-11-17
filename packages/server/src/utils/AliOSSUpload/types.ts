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

/** 上传会话存储适配器。
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

/** 片段上传时单个片段的描述信息。 */
export interface AliOSSUploadFragmentFile {
	/**
	 * 片段在目录内的文件名。
	 *
	 * 该名称会参与预览和下载时的拼接，必须由调用方固定下来并在清单中声明，
	 * 因此不能使用随机名称。
	 */
	filename: string
	fileSize: number
	contentType?: string
}

/** 为片段目录生成的单个上传签名。 */
export interface AliOSSUploadFragmentSignatureItem {
	/** 片段文件名。 */
	name: string
	/** 片段对应的 V4 预签名 PUT URL。 */
	url: string
	/** 上传时必须原样携带的请求头。 */
	headers: Record<string, string>
}

/** 片段目录批量签名结果。 */
export interface AliOSSUploadFragmentSignatureResult {
	/** 片段目录的 OSS Object Name 前缀，用于创建文件信息。 */
	objectName: string
	/** 与请求顺序一致的片段上传签名。 */
	items: AliOSSUploadFragmentSignatureItem[]
}

/** 片段目录批量签名的可选配置。 */
export interface AliOSSUploadFragmentSignatureOptions {
	/**
	 * 复用已有片段目录，用于把同一文件的多批片段签名落到同一目录。
	 *
	 * 必须是当前上传者片段根路径下的一级子目录，否则抛出 `RangeError`；
	 * 不传时每次调用都会生成新的唯一目录。
	 */
	objectName?: string
}

export interface AliOSSUploadPathInfo<TOwnerId = string | number> extends AliOSSUploadFileOptions {
	ownerId: TOwnerId
}

export type AliOSSUploadPathResolver<TOwnerId = string | number> =
	| string
	| ((info: AliOSSUploadPathInfo<TOwnerId>) => string)

/**
 * 片段目录根路径解析器。
 *
 * 片段上传会在该根路径下再生成一层唯一目录，避免同名片段互相覆盖，因此只需要依赖上传者。
 */
export type AliOSSUploadFragmentPathResolver<TOwnerId = string | number> =
	| string
	| ((info: { ownerId: TOwnerId }) => string)

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
	/** 片段上传 Object 根目录，默认 `uploads/fragments`。 */
	fragmentUploadPath?: AliOSSUploadFragmentPathResolver<TOwnerId>
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
