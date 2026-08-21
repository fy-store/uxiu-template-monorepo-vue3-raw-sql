export type AliOSSRequestHeaders = Record<string, string>

/** OSS 上传的总体进度。percent 的范围为 0 至 100。 */
export interface AliOSSUploadProgress {
	loaded: number
	total: number
	percent: number
	/** 分片上传时，最近一次产生进度变化的分片编号。 */
	partNumber?: number
	partLoaded?: number
	partTotal?: number
}

/** 一次 PUT 请求成功后的响应信息。 */
export interface AliOSSUploadResponse {
	status: number
	statusText: string
	/** 读取 ETag 需要 OSS Bucket 的 CORS 规则暴露 ETag 响应头。 */
	etag?: string
	headers: Record<string, string>
	body: string
}

export interface AliOSSSimpleUploadOptions {
	/** 必须与后端生成预签名 URL 时参与签名的请求头完全一致。 */
	headers?: AliOSSRequestHeaders
	signal?: AbortSignal
	/** 单次 PUT 超时时间，单位毫秒；0 表示不限制。 */
	timeout?: number
	onProgress?: (progress: AliOSSUploadProgress) => void
}

/** 后端为指定 partNumber 生成的 PUT 预签名 URL。 */
export interface AliOSSPresignedPart {
	partNumber: number
	url: string
	/** 当前分片独有的签名请求头，会覆盖同名的全局 headers。 */
	headers?: AliOSSRequestHeaders
}

export interface AliOSSUploadedPart extends AliOSSUploadResponse {
	partNumber: number
	size: number
}

export interface AliOSSMultipartCompleteInfo {
	file: Blob
	uploadId?: string
	parts: AliOSSUploadedPart[]
	signal: AbortSignal
}

export interface AliOSSMultipartAbortInfo {
	file: Blob
	uploadId?: string
	parts: AliOSSUploadedPart[]
	error: unknown
}

export interface AliOSSMultipartUploadOptions<TComplete = void> {
	/** 服务端 InitiateMultipartUpload 返回的 UploadId，可原样传给 complete/abort 回调。 */
	uploadId?: string
	/** 分片大小，默认 5 MiB，必须与后端生成 URL 时采用的分片大小一致。 */
	partSize?: number
	/** 同时上传的分片数，默认 3。 */
	concurrency?: number
	/** 所有分片共用的签名请求头。 */
	headers?: AliOSSRequestHeaders
	signal?: AbortSignal
	/** 每个分片 PUT 的超时时间，单位毫秒；0 表示不限制。 */
	timeout?: number
	onProgress?: (progress: AliOSSUploadProgress) => void
	onPartComplete?: (part: AliOSSUploadedPart) => void
	/** 全部分片上传成功后通知后端校验并合并。 */
	complete?: (info: AliOSSMultipartCompleteInfo) => Promise<TComplete> | TComplete
	/** 上传失败或取消后的可选清理回调，通常通知后端 AbortMultipartUpload。 */
	abort?: (info: AliOSSMultipartAbortInfo) => Promise<void> | void
}

export interface AliOSSMultipartUploadResult<TComplete = void> {
	uploadId?: string
	parts: AliOSSUploadedPart[]
	completeResult: TComplete | undefined
}

/** 断点续传任务状态。 */
export type AliOSSResumableUploadState =
	| 'preparing'
	| 'uploading'
	| 'paused'
	| 'completing'
	| 'completed'
	| 'canceled'
	| 'failed'

/** 传给后端适配器的文件描述信息。 */
export interface AliOSSResumableFileInfo {
	name?: string
	size: number
	type: string
	lastModified?: number
}

export interface AliOSSResumableBaseInfo {
	file: Blob
	fileInfo: AliOSSResumableFileInfo
	/** 由业务提供的稳定文件标识，后端可用它查找未完成的上传会话。 */
	resumeKey?: string
}

export interface AliOSSResumablePrepareInfo extends AliOSSResumableBaseInfo {
	requestedPartSize: number
	signal: AbortSignal
}

/** prepare 返回的上传会话。后端既可以创建新会话，也可以返回已有会话。 */
export interface AliOSSResumableSession {
	uploadId: string
	/** 后端实际采用的分片大小；省略时使用前端请求的大小。 */
	partSize?: number
}

export interface AliOSSResumableSessionInfo extends AliOSSResumableBaseInfo {
	uploadId: string
	partSize: number
	partCount: number
	signal: AbortSignal
}

/** 后端从 OSS ListParts 或自己的可信记录中返回的已上传分片。 */
export interface AliOSSExistingPart {
	partNumber: number
	size: number
	etag?: string
}

export interface AliOSSResumableSignPartsInfo extends AliOSSResumableSessionInfo {
	/** 当前仍缺失且需要生成新预签名 URL 的分片编号。 */
	partNumbers: number[]
}

/** 断点续传任务中的完整分片信息。 */
export interface AliOSSResumablePart extends AliOSSExistingPart {
	/** existing 表示本轮开始前已经存在，uploaded 表示本轮新上传。 */
	source: 'existing' | 'uploaded'
	/** 仅本轮新上传分片包含 PUT 响应。 */
	response?: AliOSSUploadResponse
}

export interface AliOSSResumableCompleteInfo extends AliOSSResumableSessionInfo {
	parts: AliOSSResumablePart[]
}

export interface AliOSSResumableAbortInfo extends AliOSSResumableBaseInfo {
	uploadId?: string
	partSize?: number
	partCount?: number
	error: unknown
}

/**
 * 断点续传所需的后端适配器。
 *
 * 每个方法可调用任意业务 API，只要返回值符合此契约，上传工具无需了解后端实现。
 */
export interface AliOSSResumableUploadHandler<TComplete = void> {
	/** 创建新会话，或根据 resumeKey、文件信息返回尚未完成的已有会话。 */
	prepare(info: AliOSSResumablePrepareInfo): Promise<AliOSSResumableSession> | AliOSSResumableSession
	/** 查询 OSS 中实际存在的分片；暂停恢复和页面刷新恢复时都会重新调用。 */
	listParts(info: AliOSSResumableSessionInfo): Promise<AliOSSExistingPart[]> | AliOSSExistingPart[]
	/** 只为 partNumbers 中的缺失分片生成有效的 PUT 预签名 URL。 */
	signParts(info: AliOSSResumableSignPartsInfo): Promise<AliOSSPresignedPart[]> | AliOSSPresignedPart[]
	/** 校验并合并所有分片。建议后端再次调用 ListParts 后再执行 CompleteMultipartUpload。 */
	complete(info: AliOSSResumableCompleteInfo): Promise<TComplete> | TComplete
	/** 用户明确取消后的可选清理方法；暂停或普通网络失败不会触发。 */
	abort?(info: AliOSSResumableAbortInfo): Promise<void> | void
}

export interface AliOSSResumableUploadOptions {
	/** 后端用来定位已有上传会话的稳定业务 ID 或文件 Hash。 */
	resumeKey?: string
	/** 期望分片大小，默认 5 MiB；后端可在 prepare 结果中覆写。 */
	partSize?: number
	/** 同时上传的分片数，默认 3。 */
	concurrency?: number
	/** 所有新上传分片共用的签名请求头。 */
	headers?: AliOSSRequestHeaders
	signal?: AbortSignal
	/** 每个分片 PUT 的超时时间，单位毫秒；0 表示不限制。 */
	timeout?: number
	onProgress?: (progress: AliOSSUploadProgress) => void
	onPartComplete?: (part: AliOSSResumablePart) => void
	onStateChange?: (state: AliOSSResumableUploadState) => void
}

export interface AliOSSResumableUploadResult<TComplete = void> {
	uploadId: string
	partSize: number
	parts: AliOSSResumablePart[]
	completeResult: TComplete
}
