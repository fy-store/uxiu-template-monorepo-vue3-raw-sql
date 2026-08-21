import type {
	AliOSSExistingPart,
	AliOSSMultipartUploadOptions,
	AliOSSPresignedPart,
	AliOSSResumableUploadOptions,
	AliOSSSimpleUploadOptions,
	AliOSSUploadResponse
} from './types'

/** 快速上传客户端传给后端适配器的文件描述。 */
export interface AliOSSUploaderFileInfo {
	filename: string
	fileSize: number
	contentType?: string
	lastModified?: number
}

/** 普通上传签名的最小返回结构。 */
export interface AliOSSUploaderSimpleSignature {
	url: string
	headers?: Record<string, string>
	accessUrl?: string
	objectName?: string
}

export interface AliOSSUploaderPrepareInfo extends AliOSSUploaderFileInfo {
	partSize: number
	resumeKey?: string
	signal: AbortSignal
}

export interface AliOSSUploaderPrepareResult {
	uploadId: string
	partSize: number
	partCount: number
	reused?: boolean
}

export interface AliOSSUploaderSessionInfo {
	uploadId: string
	signal: AbortSignal
}

export interface AliOSSUploaderSignPartsInfo extends AliOSSUploaderSessionInfo {
	partNumbers: number[]
}

export interface AliOSSUploaderAbortInfo {
	uploadId: string
	error: unknown
}

/**
 * 快速上传客户端所需的后端接口适配器。
 *
 * 方法内部可以使用 Axios、Fetch 或任意请求库，只需返回解包后的业务数据。
 */
export interface AliOSSUploaderBackend<TSimpleSignature extends AliOSSUploaderSimpleSignature, TComplete> {
	createSimpleSignature(
		info: AliOSSUploaderFileInfo & { signal: AbortSignal }
	): Promise<TSimpleSignature>
	prepareMultipart(info: AliOSSUploaderPrepareInfo): Promise<AliOSSUploaderPrepareResult>
	listMultipartParts(info: AliOSSUploaderSessionInfo): Promise<AliOSSExistingPart[]>
	signMultipartParts(info: AliOSSUploaderSignPartsInfo): Promise<AliOSSPresignedPart[]>
	completeMultipart(info: AliOSSUploaderSessionInfo): Promise<TComplete>
	abortMultipart(info: AliOSSUploaderAbortInfo): Promise<void>
}

export interface AliOSSUploaderFileOptions {
	/** Blob 没有文件名时使用；File 默认读取自身 name。 */
	filename?: string
}

export interface AliOSSUploaderSimpleOptions
	extends AliOSSUploaderFileOptions, Pick<AliOSSSimpleUploadOptions, 'signal' | 'timeout' | 'onProgress'> {}

export interface AliOSSUploaderSimpleResult<TSignature extends AliOSSUploaderSimpleSignature> {
	signature: TSignature
	response: AliOSSUploadResponse
}

export interface AliOSSUploaderMultipartOptions
	extends
		AliOSSUploaderFileOptions,
		Pick<
			AliOSSMultipartUploadOptions,
			'signal' | 'partSize' | 'concurrency' | 'headers' | 'timeout' | 'onProgress' | 'onPartComplete'
		> {}

export interface AliOSSUploaderResumableOptions extends AliOSSUploaderFileOptions, AliOSSResumableUploadOptions {}
