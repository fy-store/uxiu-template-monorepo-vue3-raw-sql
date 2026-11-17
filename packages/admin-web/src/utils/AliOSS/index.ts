import { concurrencyControl } from '@common/concurrencyControl'
import { createResumableUploadTask } from './resumable'
import type {
	AliOSSMultipartUploadOptions,
	AliOSSMultipartUploadResult,
	AliOSSPresignedPart,
	AliOSSRequestHeaders,
	AliOSSResumableUploadHandler,
	AliOSSResumableUploadOptions,
	AliOSSSimpleUploadOptions,
	AliOSSUploadedPart,
	AliOSSUploadProgress,
	AliOSSUploadResponse
} from './types'
export { AliOSSResumableUploadTask } from './resumable'
export type * from './types'
export * from './uploader'

const DEFAULT_PART_SIZE = 5 * 1024 * 1024
const DEFAULT_CONCURRENCY = 3
const MAX_PART_SIZE = 5 * 1024 ** 3

/** 可取消且可直接 await 的 OSS 上传任务。 */
export class AliOSSUploadTask<TResult> implements PromiseLike<TResult> {
	/** 上传任务最终完成或失败的原始 Promise。 */
	readonly promise: Promise<TResult>
	/** 任务内部使用的取消信号；调用 cancel 后会变为 aborted。 */
	readonly signal: AbortSignal

	private readonly controller = new AbortController()

	/**
	 * 创建一个上传任务。
	 *
	 * 通常无需直接实例化，请使用 AliOSS.simpleUpload 或 AliOSS.multipartUpload。
	 *
	 * @param executor 实际执行上传的异步函数。
	 * @param externalSignal 可选的外部取消信号，触发后会同步取消当前任务。
	 */
	constructor(executor: (signal: AbortSignal) => Promise<TResult>, externalSignal?: AbortSignal) {
		this.signal = this.controller.signal

		const cancelFromExternalSignal = () => {
			this.controller.abort(resolveAbortReason(externalSignal!))
		}
		if (externalSignal?.aborted) {
			cancelFromExternalSignal()
		} else {
			externalSignal?.addEventListener('abort', cancelFromExternalSignal, { once: true })
		}

		this.promise = Promise.resolve()
			.then(() => executor(this.signal))
			.finally(() => externalSignal?.removeEventListener('abort', cancelFromExternalSignal))
	}

	/**
	 * 取消该任务以及所有正在进行的分片请求。
	 *
	 * 重复调用不会产生额外效果。未传原因时，任务会以 AliOSSUploadCanceledError 拒绝。
	 *
	 * @param reason 可选的取消原因；传入 Error 时会作为任务的拒绝原因。
	 */
	cancel(reason?: unknown) {
		if (this.signal.aborted) return
		this.controller.abort(
			reason instanceof Error ? reason : new AliOSSUploadCanceledError(typeof reason === 'string' ? reason : undefined)
		)
	}

	/**
	 * 注册任务成功和失败回调，使上传任务可像 Promise 一样被 await 或链式调用。
	 *
	 * @param onfulfilled 上传成功回调。
	 * @param onrejected 上传失败或取消回调。
	 * @returns 链式 Promise。
	 */
	then<TResult1 = TResult, TResult2 = never>(
		onfulfilled?: ((value: TResult) => TResult1 | PromiseLike<TResult1>) | null,
		onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
	) {
		return this.promise.then(onfulfilled, onrejected)
	}

	/**
	 * 注册任务失败或取消回调。
	 *
	 * @param onrejected 上传失败或取消回调。
	 * @returns 链式 Promise。
	 */
	catch<TResult2 = never>(onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null) {
		return this.promise.catch(onrejected)
	}

	/**
	 * 注册无论成功、失败或取消都会执行的回调。
	 *
	 * @param onfinally 任务结束回调。
	 * @returns 链式 Promise。
	 */
	finally(onfinally?: (() => void) | null) {
		return this.promise.finally(onfinally ?? undefined)
	}
}

export class AliOSSUploadCanceledError extends Error {
	/**
	 * 创建上传取消错误。
	 *
	 * @param message 取消原因描述。
	 */
	constructor(message = 'OSS upload canceled') {
		super(message)
		this.name = 'AliOSSUploadCanceledError'
	}
}

export class AliOSSUploadError extends Error {
	readonly status?: number
	readonly responseBody?: string

	/**
	 * 创建 OSS 上传错误。
	 *
	 * @param message 错误描述。
	 * @param status OSS HTTP 状态码；网络或 CORS 错误时不存在。
	 * @param responseBody OSS 返回的原始响应体。
	 */
	constructor(message: string, status?: number, responseBody?: string) {
		super(message)
		this.name = 'AliOSSUploadError'
		this.status = status
		this.responseBody = responseBody
	}
}

function resolveAbortReason(signal: AbortSignal) {
	if (signal.reason instanceof Error) return signal.reason
	return new AliOSSUploadCanceledError(typeof signal.reason === 'string' ? signal.reason : undefined)
}

function throwIfAborted(signal: AbortSignal) {
	if (signal.aborted) throw resolveAbortReason(signal)
}

function validateBlob(file: Blob) {
	if (!(file instanceof Blob)) throw new TypeError('file must be a Blob or File')
}

function validateTimeout(timeout = 0) {
	if (!Number.isFinite(timeout) || timeout < 0) {
		throw new RangeError('timeout must be a non-negative finite number')
	}
	return timeout
}

function validateHeaders(headers: AliOSSRequestHeaders | undefined) {
	const resolvedHeaders: AliOSSRequestHeaders = {}
	const headerNames = new Set<string>()

	for (const [name, value] of Object.entries(headers ?? {})) {
		const normalizedName = name.toLowerCase()
		if (normalizedName === 'content-length') {
			throw new TypeError('Content-Length is managed by the browser and must not be set manually')
		}
		if (headerNames.has(normalizedName)) throw new TypeError(`duplicate request header: ${name}`)
		if (typeof value !== 'string') throw new TypeError(`headers.${name} must be a string`)

		headerNames.add(normalizedName)
		resolvedHeaders[name] = value
	}
	return resolvedHeaders
}

function mergeHeaders(base: AliOSSRequestHeaders | undefined, overrides: AliOSSRequestHeaders | undefined) {
	const result = validateHeaders(base)
	const names = new Map(Object.keys(result).map((name) => [name.toLowerCase(), name]))

	for (const [name, value] of Object.entries(validateHeaders(overrides))) {
		const previousName = names.get(name.toLowerCase())
		if (previousName) delete result[previousName]
		result[name] = value
	}
	return result
}

function hasHeader(headers: AliOSSRequestHeaders, expectedName: string) {
	return Object.keys(headers).some((name) => name.toLowerCase() === expectedName)
}

function parseResponseHeaders(rawHeaders: string) {
	const headers: Record<string, string> = {}
	for (const line of rawHeaders.trim().split(/[\r\n]+/)) {
		if (!line) continue
		const separatorIndex = line.indexOf(':')
		if (separatorIndex < 0) continue

		const name = line.slice(0, separatorIndex).trim().toLowerCase()
		const value = line.slice(separatorIndex + 1).trim()
		headers[name] = headers[name] ? `${headers[name]}, ${value}` : value
	}
	return headers
}

function createProgress(loaded: number, total: number, part?: Partial<AliOSSUploadProgress>): AliOSSUploadProgress {
	return {
		loaded,
		total,
		percent: total === 0 ? 100 : Math.min(100, Math.max(0, (loaded / total) * 100)),
		...part
	}
}

function putBlob(
	url: string,
	body: Blob,
	headers: AliOSSRequestHeaders,
	timeout: number,
	signal: AbortSignal,
	onProgress?: (loaded: number, total: number) => void
) {
	if (typeof url !== 'string' || url.length === 0) {
		return Promise.reject(new TypeError('presigned URL must be a non-empty string'))
	}

	return new Promise<AliOSSUploadResponse>((resolve, reject) => {
		throwIfAborted(signal)
		const xhr = new XMLHttpRequest()
		let settled = false

		const cancelRequest = () => xhr.abort()
		const finish = (callback: () => void) => {
			if (settled) return
			settled = true
			signal.removeEventListener('abort', cancelRequest)
			callback()
		}

		xhr.open('PUT', url, true)
		xhr.timeout = timeout
		for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value)

		xhr.upload.onprogress = (event) => onProgress?.(Math.min(event.loaded, body.size), body.size)
		xhr.onload = () => {
			const responseHeaders = parseResponseHeaders(xhr.getAllResponseHeaders())
			if (xhr.status >= 200 && xhr.status < 300) {
				finish(() =>
					resolve({
						status: xhr.status,
						statusText: xhr.statusText,
						etag: xhr.getResponseHeader('ETag') ?? undefined,
						headers: responseHeaders,
						body: xhr.responseText
					})
				)
				return
			}
			finish(() =>
				reject(new AliOSSUploadError(`OSS upload failed with HTTP ${xhr.status}`, xhr.status, xhr.responseText))
			)
		}
		xhr.onerror = () => finish(() => reject(new AliOSSUploadError('OSS upload failed because of network or CORS')))
		xhr.ontimeout = () => finish(() => reject(new AliOSSUploadError(`OSS upload timed out after ${timeout}ms`)))
		xhr.onabort = () => finish(() => reject(resolveAbortReason(signal)))

		signal.addEventListener('abort', cancelRequest, { once: true })
		if (signal.aborted) {
			cancelRequest()
			return
		}

		// 未签名 Content-Type 时使用无 MIME 类型的 Blob，避免浏览器自动添加该请求头导致签名不匹配。
		const requestBody = hasHeader(headers, 'content-type') ? body : body.slice(0, body.size, '')
		try {
			xhr.send(requestBody)
		} catch (error) {
			finish(() => reject(error))
		}
	})
}

function validateMultipartParts(file: Blob, parts: AliOSSPresignedPart[], partSize: number) {
	if (!Number.isSafeInteger(partSize) || partSize <= 0 || partSize > MAX_PART_SIZE) {
		throw new RangeError(`partSize must be an integer between 1 and ${MAX_PART_SIZE}`)
	}
	if (file.size === 0) throw new RangeError('multipart upload does not support an empty file')
	if (!Array.isArray(parts)) throw new TypeError('parts must be an array')

	const expectedPartCount = Math.ceil(file.size / partSize)
	if (parts.length !== expectedPartCount) {
		throw new RangeError(`expected ${expectedPartCount} presigned part URLs, received ${parts.length}`)
	}

	const sortedParts = [...parts].sort((a, b) => a.partNumber - b.partNumber)
	for (let index = 0; index < sortedParts.length; index++) {
		const part = sortedParts[index]
		const expectedPartNumber = index + 1
		if (!Number.isSafeInteger(part.partNumber) || part.partNumber !== expectedPartNumber) {
			throw new RangeError(`parts must contain every partNumber from 1 to ${expectedPartCount} exactly once`)
		}
		if (typeof part.url !== 'string' || part.url.length === 0) {
			throw new TypeError(`parts[${index}].url must be a non-empty string`)
		}

		try {
			const signedPartNumber = new URL(part.url).searchParams.get('partNumber')
			if (signedPartNumber !== null && Number(signedPartNumber) !== part.partNumber) {
				throw new RangeError(`partNumber ${part.partNumber} does not match its presigned URL`)
			}
		} catch (error) {
			if (error instanceof RangeError) throw error
			throw new TypeError(`parts[${index}].url must be an absolute URL`)
		}
	}
	return sortedParts
}

function validateConcurrency(concurrency: number) {
	if (!Number.isSafeInteger(concurrency) || concurrency < 1) {
		throw new RangeError('concurrency must be a positive integer')
	}
	return concurrency
}

/**
 * 使用后端生成的预签名 URL 从浏览器直传阿里云 OSS。
 *
 * 本工具不会携带项目 API 的 Cookie、Token 或 Axios 拦截器配置，也不会自动增加签名请求头。
 * 文档：https://help.aliyun.com/zh/oss/user-guide/upload-files-using-presigned-urls
 */
export class AliOSS {
	/**
	 * 使用 PUT 预签名 URL 上传单个 File 或 Blob。
	 *
	 * 请求体会直接发送给 OSS，不会包装成 FormData。headers 必须与后端签名时指定的 Header 完全一致；
	 * 未提供 Content-Type 时，工具会避免浏览器根据 Blob.type 自动增加该 Header。
	 *
	 * @param file 待上传的 File 或 Blob。
	 * @param url 后端生成的 PUT 预签名绝对 URL。
	 * @param options 签名请求头、进度、取消信号和超时配置。
	 * @returns 可取消、可直接 await 的上传任务。
	 *
	 * @example
	 * ```ts
	 * const task = AliOSS.simpleUpload(file, signedUrl, {
	 *   headers: signedHeaders,
	 *   onProgress: ({ percent }) => console.log(percent)
	 * })
	 *
	 * const response = await task
	 * ```
	 */
	static simpleUpload(file: Blob, url: string, options: AliOSSSimpleUploadOptions = {}) {
		return new AliOSSUploadTask<AliOSSUploadResponse>(async (signal) => {
			validateBlob(file)
			const headers = validateHeaders(options.headers)
			const timeout = validateTimeout(options.timeout)
			throwIfAborted(signal)
			options.onProgress?.(createProgress(0, file.size))

			const response = await putBlob(url, file, headers, timeout, signal, (loaded) => {
				options.onProgress?.(createProgress(loaded, file.size))
			})
			options.onProgress?.(createProgress(file.size, file.size))
			return response
		}, options.signal)
	}

	/**
	 * 并发上传各 partNumber 的预签名 URL，并在全部成功后调用 complete。
	 *
	 * partSize 必须与后端生成预签名 URL 时使用的分片大小一致。工具会校验分片编号完整性，
	 * 按编号切割文件并聚合所有在途分片的上传进度。任意分片、complete 回调失败或任务被取消时，
	 * 会中止其余 PUT 请求并调用可选的 abort 清理回调。
	 *
	 * @param file 待分片上传的 File 或 Blob；空文件不支持分片上传。
	 * @param parts 后端返回的完整预签名分片列表，partNumber 必须从 1 连续到总分片数。
	 * @param options UploadId、分片大小、并发、进度、合并和失败清理配置。
	 * @returns 可取消、可直接 await 的分片上传任务；结果包含排序后的分片响应和后端合并结果。
	 *
	 * @example
	 * ```ts
	 * const task = AliOSS.multipartUpload(file, initResult.parts, {
	 *   uploadId: initResult.uploadId,
	 *   partSize: initResult.partSize,
	 *   onProgress: ({ percent }) => console.log(percent),
	 *   complete: (info) => completeUpload(info.uploadId, info.parts),
	 *   abort: (info) => abortUpload(info.uploadId)
	 * })
	 *
	 * const result = await task
	 * ```
	 */
	static multipartUpload<TComplete = void>(
		file: Blob,
		parts: AliOSSPresignedPart[],
		options: AliOSSMultipartUploadOptions<TComplete> = {}
	) {
		return new AliOSSUploadTask<AliOSSMultipartUploadResult<TComplete>>(async (signal) => {
			validateBlob(file)
			const partSize = options.partSize ?? DEFAULT_PART_SIZE
			const concurrency = validateConcurrency(options.concurrency ?? DEFAULT_CONCURRENCY)
			const timeout = validateTimeout(options.timeout)
			const sortedParts = validateMultipartParts(file, parts, partSize)
			const uploadedParts: AliOSSUploadedPart[] = []
			const loadedByPart = new Map<number, number>()
			const uploadController = new AbortController()
			const abortUploads = () => uploadController.abort(resolveAbortReason(signal))
			let nextPartIndex = 0

			signal.addEventListener('abort', abortUploads, { once: true })
			if (signal.aborted) abortUploads()
			options.onProgress?.(createProgress(0, file.size))

			const updateProgress = (partNumber: number, partLoaded: number, partTotal: number) => {
				loadedByPart.set(partNumber, partLoaded)
				const loaded = [...loadedByPart.values()].reduce((total, value) => total + value, 0)
				options.onProgress?.(createProgress(loaded, file.size, { partNumber, partLoaded, partTotal }))
			}

			try {
				throwIfAborted(signal)
				await concurrencyControl(
					async (context) => {
						const currentIndex = nextPartIndex++
						const part = sortedParts[currentIndex]
						if (!part) {
							context.stop()
							return
						}

						const start = (part.partNumber - 1) * partSize
						const blob = file.slice(start, Math.min(start + partSize, file.size))
						const response = await putBlob(
							part.url,
							blob,
							mergeHeaders(options.headers, part.headers),
							timeout,
							uploadController.signal,
							(loaded) => updateProgress(part.partNumber, loaded, blob.size)
						)
						const uploadedPart = { ...response, partNumber: part.partNumber, size: blob.size }
						uploadedParts.push(uploadedPart)
						updateProgress(part.partNumber, blob.size, blob.size)
						options.onPartComplete?.(uploadedPart)

						if (nextPartIndex >= sortedParts.length) context.stop()
					},
					Math.min(concurrency, sortedParts.length)
				)

				throwIfAborted(signal)
				uploadedParts.sort((a, b) => a.partNumber - b.partNumber)
				const completeResult = await options.complete?.({
					file,
					uploadId: options.uploadId,
					parts: uploadedParts,
					signal
				})
				return { uploadId: options.uploadId, parts: uploadedParts, completeResult }
			} catch (error) {
				uploadController.abort(error)
				uploadedParts.sort((a, b) => a.partNumber - b.partNumber)
				try {
					await options.abort?.({ file, uploadId: options.uploadId, parts: uploadedParts, error })
				} catch (cleanupError) {
					throw new AggregateError([error, cleanupError], 'OSS multipart upload and cleanup both failed')
				}
				throw error
			} finally {
				signal.removeEventListener('abort', abortUploads)
			}
		}, options.signal)
	}

	/**
	 * 使用后端适配器执行可暂停、可恢复且支持跨页面重新续传的分片上传。
	 *
	 * 工具依次触发 handler.prepare、handler.listParts、handler.signParts 和 handler.complete，
	 * 但不关心这些方法调用的后端 URL 或响应协议。恢复时以 listParts 返回的 OSS 实际分片为准，
	 * 只为缺失或大小不正确的分片请求新 URL 并重新上传。
	 *
	 * @param file 待上传的 File 或 Blob；空文件不支持断点续传。
	 * @param handler 后端交互适配器，实现规定的五个触发方法即可。
	 * @param options 稳定续传标识、分片、并发、进度、状态和外部取消配置。
	 * @returns 支持 pause、resume、cancel 且可直接 await 的断点续传任务。
	 *
	 * @example
	 * ```ts
	 * const task = AliOSS.resumableUpload(file, handler, {
	 *   resumeKey: fileHash,
	 *   onProgress: ({ percent }) => console.log(percent)
	 * })
	 *
	 * task.pause()
	 * task.resume()
	 * const result = await task
	 * ```
	 */
	static resumableUpload<TComplete = void>(
		file: Blob,
		handler: AliOSSResumableUploadHandler<TComplete>,
		options: AliOSSResumableUploadOptions = {}
	) {
		return createResumableUploadTask<TComplete>(file, handler, options, (blob, url, uploadOptions) =>
			AliOSS.simpleUpload(blob, url, uploadOptions)
		)
	}

	/**
	 * 判断错误是否由 task.cancel 或 AbortSignal 导致。
	 *
	 * @param error catch 捕获到的未知错误。
	 * @returns 是否为上传取消错误。
	 */
	static isCanceled(error: unknown) {
		return (
			error instanceof AliOSSUploadCanceledError ||
			(error instanceof DOMException && error.name === 'AbortError') ||
			(error instanceof Error && error.name === 'AbortError')
		)
	}
}
