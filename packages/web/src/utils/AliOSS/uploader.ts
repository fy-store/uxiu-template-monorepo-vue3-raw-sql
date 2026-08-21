import { AliOSS, AliOSSUploadTask } from './index'
import type { AliOSSResumableUploadHandler } from './types'
import type {
	AliOSSUploaderBackend,
	AliOSSUploaderFileInfo,
	AliOSSUploaderMultipartOptions,
	AliOSSUploaderResumableOptions,
	AliOSSUploaderSimpleOptions,
	AliOSSUploaderSimpleResult,
	AliOSSUploaderSimpleSignature
} from './uploaderTypes'

export type * from './uploaderTypes'

const DEFAULT_PART_SIZE = 5 * 1024 * 1024

function resolveFileInfo(file: Blob, filename?: string): AliOSSUploaderFileInfo {
	if (!(file instanceof Blob)) throw new TypeError('file must be a Blob or File')
	const isFile = typeof File !== 'undefined' && file instanceof File
	return {
		filename: filename ?? (isFile ? file.name : 'blob'),
		fileSize: file.size,
		contentType: file.type || undefined,
		lastModified: isFile ? file.lastModified : undefined
	}
}

/**
 * 前端 OSS 快速上传客户端。
 *
 * 配置一次后端适配器后，即可直接调用 simpleUpload、multipartUpload 和 resumableUpload，
 * 无需在每个页面重复编写签名、完成、取消及续传回调。
 */
export class AliOSSUploader<
	TSimpleSignature extends AliOSSUploaderSimpleSignature = AliOSSUploaderSimpleSignature,
	TComplete = void
> {
	/** 创建快速上传客户端。 */
	constructor(private readonly backend: AliOSSUploaderBackend<TSimpleSignature, TComplete>) {
		if (!backend || typeof backend !== 'object') throw new TypeError('backend is required')
		for (const name of [
			'createSimpleSignature',
			'prepareMultipart',
			'listMultipartParts',
			'signMultipartParts',
			'completeMultipart',
			'abortMultipart'
		] as const) {
			if (typeof backend[name] !== 'function') throw new TypeError(`backend.${name} must be a function`)
		}
	}

	/** 申请普通上传签名并直接 PUT 文件到 OSS。 */
	simpleUpload(file: Blob, options: AliOSSUploaderSimpleOptions = {}) {
		return new AliOSSUploadTask<AliOSSUploaderSimpleResult<TSimpleSignature>>(async (signal) => {
			const fileInfo = resolveFileInfo(file, options.filename)
			const signature = await this.backend.createSimpleSignature({ ...fileInfo, signal })
			const response = await AliOSS.simpleUpload(file, signature.url, {
				headers: signature.headers,
				signal,
				timeout: options.timeout,
				onProgress: options.onProgress
			})
			return { signature, response }
		}, options.signal)
	}

	/** 初始化、签名、并发上传、合并，并在失败或取消时自动清理。 */
	multipartUpload(file: Blob, options: AliOSSUploaderMultipartOptions = {}) {
		return new AliOSSUploadTask(async (signal) => {
			const fileInfo = resolveFileInfo(file, options.filename)
			let uploadId: string | undefined
			let uploadStarted = false

			try {
				const prepared = await this.backend.prepareMultipart({
					...fileInfo,
					partSize: options.partSize ?? DEFAULT_PART_SIZE,
					signal
				})
				uploadId = prepared.uploadId
				const partNumbers = Array.from({ length: prepared.partCount }, (_, index) => index + 1)
				const parts = await this.backend.signMultipartParts({ uploadId, partNumbers, signal })
				uploadStarted = true
				return await AliOSS.multipartUpload<TComplete>(file, parts, {
					uploadId,
					partSize: prepared.partSize,
					concurrency: options.concurrency,
					headers: options.headers,
					signal,
					timeout: options.timeout,
					onProgress: options.onProgress,
					onPartComplete: options.onPartComplete,
					complete: ({ uploadId, signal }) => this.backend.completeMultipart({ uploadId: uploadId!, signal }),
					abort: ({ uploadId, error }) => this.backend.abortMultipart({ uploadId: uploadId!, error })
				})
			} catch (error) {
				if (uploadId && !uploadStarted) {
					try {
						await this.backend.abortMultipart({ uploadId, error })
					} catch (cleanupError) {
						throw new AggregateError([error, cleanupError], 'OSS multipart preparation and cleanup both failed')
					}
				}
				throw error
			}
		}, options.signal)
	}

	/** 创建支持暂停、继续、页面刷新恢复和永久取消的上传任务。 */
	resumableUpload(file: Blob, options: AliOSSUploaderResumableOptions = {}) {
		const fileInfo = resolveFileInfo(file, options.filename)
		const handler: AliOSSResumableUploadHandler<TComplete> = {
			prepare: async ({ requestedPartSize, resumeKey, signal }) => {
				const prepared = await this.backend.prepareMultipart({
					...fileInfo,
					partSize: requestedPartSize,
					resumeKey,
					signal
				})
				return { uploadId: prepared.uploadId, partSize: prepared.partSize }
			},
			listParts: ({ uploadId, signal }) => this.backend.listMultipartParts({ uploadId, signal }),
			signParts: ({ uploadId, partNumbers, signal }) =>
				this.backend.signMultipartParts({ uploadId, partNumbers, signal }),
			complete: ({ uploadId, signal }) => this.backend.completeMultipart({ uploadId, signal }),
			abort: ({ uploadId, error }) => (uploadId ? this.backend.abortMultipart({ uploadId, error }) : Promise.resolve())
		}
		return AliOSS.resumableUpload(file, handler, options)
	}
}

/** 使用后端适配器创建前端 OSS 快速上传客户端。 */
export function createAliOSSUploader<
	TSimpleSignature extends AliOSSUploaderSimpleSignature = AliOSSUploaderSimpleSignature,
	TComplete = void
>(backend: AliOSSUploaderBackend<TSimpleSignature, TComplete>) {
	return new AliOSSUploader(backend)
}
