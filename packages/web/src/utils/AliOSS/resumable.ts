import { concurrencyControl } from '@common/concurrencyControl'
import type {
	AliOSSExistingPart,
	AliOSSPresignedPart,
	AliOSSRequestHeaders,
	AliOSSResumableFileInfo,
	AliOSSResumablePart,
	AliOSSResumableUploadHandler,
	AliOSSResumableUploadOptions,
	AliOSSResumableUploadResult,
	AliOSSResumableUploadState,
	AliOSSSimpleUploadOptions,
	AliOSSUploadProgress,
	AliOSSUploadResponse
} from './types'

const DEFAULT_PART_SIZE = 5 * 1024 * 1024
const DEFAULT_CONCURRENCY = 3
const MAX_PART_SIZE = 5 * 1024 ** 3

interface AliOSSResumableSessionState {
	uploadId: string
	partSize: number
	partCount: number
}

interface AliOSSResumableTaskControl {
	readonly signal: AbortSignal
	beginCycle(): AbortSignal
	endCycle(): void
	isPaused(): boolean
	waitForResume(): Promise<void>
	setState(state: AliOSSResumableUploadState): void
}

type AliOSSUploadPart = (
	file: Blob,
	url: string,
	options: AliOSSSimpleUploadOptions
) => PromiseLike<AliOSSUploadResponse>

class AliOSSUploadPausedError extends Error {
	constructor() {
		super('OSS resumable upload paused')
		this.name = 'AliOSSUploadPausedError'
	}
}

function createCanceledError(reason?: unknown) {
	if (reason instanceof Error) return reason
	const error = new Error(typeof reason === 'string' ? reason : 'OSS resumable upload canceled')
	error.name = 'AbortError'
	return error
}

function resolveAbortReason(signal: AbortSignal) {
	return createCanceledError(signal.reason)
}

function throwIfAborted(signal: AbortSignal) {
	if (signal.aborted) throw resolveAbortReason(signal)
}

/**
 * 支持暂停、继续和永久取消的断点续传任务。
 *
 * 通常由 AliOSS.resumableUpload 创建，不需要直接实例化。
 */
export class AliOSSResumableUploadTask<TResult> implements PromiseLike<TResult> {
	readonly promise: Promise<TResult>
	readonly signal: AbortSignal

	private readonly controller = new AbortController()
	private activeController?: AbortController
	private removeActiveAbortListener?: () => void
	private resumeResolver?: () => void
	private paused = false
	private currentState: AliOSSResumableUploadState = 'preparing'
	private readonly onStateChange?: (state: AliOSSResumableUploadState) => void

	/** 当前任务状态。 */
	get state() {
		return this.currentState
	}

	/**
	 * 创建断点续传任务。
	 *
	 * @param executor 上传工作流执行器。
	 * @param options 外部取消信号和状态监听配置。
	 */
	constructor(
		executor: (control: AliOSSResumableTaskControl) => Promise<TResult>,
		options: Pick<AliOSSResumableUploadOptions, 'signal' | 'onStateChange'> = {}
	) {
		this.signal = this.controller.signal
		this.onStateChange = options.onStateChange
		options.onStateChange?.(this.currentState)

		const cancelFromExternalSignal = () => this.cancel(options.signal?.reason)
		if (options.signal?.aborted) {
			cancelFromExternalSignal()
		} else {
			options.signal?.addEventListener('abort', cancelFromExternalSignal, { once: true })
		}

		const control: AliOSSResumableTaskControl = {
			signal: this.signal,
			beginCycle: () => this.beginCycle(),
			endCycle: () => this.endCycle(),
			isPaused: () => this.paused,
			waitForResume: () => this.waitForResume(),
			setState: (state) => this.setState(state)
		}

		this.promise = Promise.resolve()
			.then(() => executor(control))
			.then((result) => {
				this.setState('completed')
				return result
			})
			.catch((error) => {
				this.setState(this.signal.aborted ? 'canceled' : 'failed')
				throw error
			})
			.finally(() => {
				this.endCycle()
				options.signal?.removeEventListener('abort', cancelFromExternalSignal)
			})
	}

	/**
	 * 暂停准备或上传阶段，并中止当前在途 PUT 请求。
	 *
	 * 已上传完成的分片保留在 OSS；调用 resume 后会重新查询后端并只上传缺失分片。
	 * 后端合并阶段不会被 pause 中止，应使用 cancel 永久取消。
	 */
	pause() {
		if (this.paused || !['preparing', 'uploading'].includes(this.currentState)) return
		this.paused = true
		this.setState('paused')
		this.activeController?.abort(new AliOSSUploadPausedError())
	}

	/** 恢复已暂停任务；恢复前会重新触发 listParts 和 signParts。 */
	resume() {
		if (!this.paused || this.signal.aborted) return
		this.paused = false
		this.setState('preparing')
		this.resumeResolver?.()
		this.resumeResolver = undefined
	}

	/**
	 * 永久取消任务。
	 *
	 * 取消会中止在途请求、拒绝任务 Promise，并触发后端适配器的可选 abort 方法。
	 *
	 * @param reason 可选取消原因。
	 */
	cancel(reason?: unknown) {
		if (this.signal.aborted || ['completed', 'canceled', 'failed'].includes(this.currentState)) return
		this.controller.abort(createCanceledError(reason))
		this.resumeResolver?.()
		this.resumeResolver = undefined
	}

	/** 注册任务成功和失败回调。 */
	then<TResult1 = TResult, TResult2 = never>(
		onfulfilled?: ((value: TResult) => TResult1 | PromiseLike<TResult1>) | null,
		onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
	) {
		return this.promise.then(onfulfilled, onrejected)
	}

	/** 注册任务失败或取消回调。 */
	catch<TResult2 = never>(onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null) {
		return this.promise.catch(onrejected)
	}

	/** 注册任务结束回调。 */
	finally(onfinally?: (() => void) | null) {
		return this.promise.finally(onfinally ?? undefined)
	}

	private setState(state: AliOSSResumableUploadState) {
		if (this.currentState === state) return
		this.currentState = state
		this.onStateChange?.(state)
	}

	private beginCycle() {
		throwIfAborted(this.signal)
		this.endCycle()
		const controller = new AbortController()
		const abortCycle = () => controller.abort(resolveAbortReason(this.signal))
		this.signal.addEventListener('abort', abortCycle, { once: true })
		this.activeController = controller
		this.removeActiveAbortListener = () => this.signal.removeEventListener('abort', abortCycle)
		return controller.signal
	}

	private endCycle() {
		this.removeActiveAbortListener?.()
		this.removeActiveAbortListener = undefined
		this.activeController = undefined
	}

	private async waitForResume() {
		throwIfAborted(this.signal)
		if (!this.paused) return
		await new Promise<void>((resolve) => {
			this.resumeResolver = resolve
		})
		throwIfAborted(this.signal)
	}
}

function validatePartSize(partSize: number) {
	if (!Number.isSafeInteger(partSize) || partSize <= 0 || partSize > MAX_PART_SIZE) {
		throw new RangeError(`partSize must be an integer between 1 and ${MAX_PART_SIZE}`)
	}
	return partSize
}

function validateConcurrency(concurrency: number) {
	if (!Number.isSafeInteger(concurrency) || concurrency < 1) {
		throw new RangeError('concurrency must be a positive integer')
	}
	return concurrency
}

function validateTimeout(timeout = 0) {
	if (!Number.isFinite(timeout) || timeout < 0) {
		throw new RangeError('timeout must be a non-negative finite number')
	}
	return timeout
}

function createFileInfo(file: Blob): AliOSSResumableFileInfo {
	const isFile = typeof File !== 'undefined' && file instanceof File
	return {
		name: isFile ? file.name : undefined,
		size: file.size,
		type: file.type,
		lastModified: isFile ? file.lastModified : undefined
	}
}

function createProgress(loaded: number, total: number, part?: Partial<AliOSSUploadProgress>): AliOSSUploadProgress {
	return {
		loaded,
		total,
		percent: total === 0 ? 100 : Math.min(100, Math.max(0, (loaded / total) * 100)),
		...part
	}
}

function expectedPartSize(fileSize: number, partSize: number, partNumber: number) {
	const start = (partNumber - 1) * partSize
	return Math.min(partSize, fileSize - start)
}

function normalizeExistingParts(file: Blob, parts: AliOSSExistingPart[], partSize: number, partCount: number) {
	if (!Array.isArray(parts)) throw new TypeError('listParts must return an array')
	const seen = new Set<number>()
	const resolvedParts: AliOSSResumablePart[] = []

	for (const part of parts) {
		if (!Number.isSafeInteger(part.partNumber) || part.partNumber < 1 || part.partNumber > partCount) {
			throw new RangeError(`listParts returned invalid partNumber: ${part.partNumber}`)
		}
		if (seen.has(part.partNumber)) throw new Error(`listParts returned duplicate partNumber: ${part.partNumber}`)
		if (!Number.isSafeInteger(part.size) || part.size < 0) {
			throw new RangeError(`listParts returned invalid size for partNumber ${part.partNumber}`)
		}
		if (part.etag !== undefined && typeof part.etag !== 'string') {
			throw new TypeError(`listParts returned invalid etag for partNumber ${part.partNumber}`)
		}

		seen.add(part.partNumber)
		if (part.size !== expectedPartSize(file.size, partSize, part.partNumber)) continue
		resolvedParts.push({ ...part, source: 'existing' })
	}
	return resolvedParts.sort((a, b) => a.partNumber - b.partNumber)
}

function validateSignedParts(parts: AliOSSPresignedPart[], partNumbers: number[]) {
	if (!Array.isArray(parts)) throw new TypeError('signParts must return an array')
	if (parts.length !== partNumbers.length) {
		throw new RangeError(`signParts must return ${partNumbers.length} URLs, received ${parts.length}`)
	}

	const expectedPartNumbers = new Set(partNumbers)
	const seen = new Set<number>()
	for (const part of parts) {
		if (!expectedPartNumbers.has(part.partNumber) || seen.has(part.partNumber)) {
			throw new RangeError('signParts returned a missing, unexpected, or duplicate partNumber')
		}
		if (typeof part.url !== 'string' || part.url.length === 0) {
			throw new TypeError(`signParts returned an invalid URL for partNumber ${part.partNumber}`)
		}

		try {
			const signedPartNumber = new URL(part.url).searchParams.get('partNumber')
			if (signedPartNumber !== null && Number(signedPartNumber) !== part.partNumber) {
				throw new RangeError(`partNumber ${part.partNumber} does not match its presigned URL`)
			}
		} catch (error) {
			if (error instanceof RangeError) throw error
			throw new TypeError(`signParts returned a non-absolute URL for partNumber ${part.partNumber}`)
		}
		seen.add(part.partNumber)
	}
	return [...parts].sort((a, b) => a.partNumber - b.partNumber)
}

function mergeHeaders(base: AliOSSRequestHeaders | undefined, overrides: AliOSSRequestHeaders | undefined) {
	const result: AliOSSRequestHeaders = { ...(base ?? {}) }
	const names = new Map(Object.keys(result).map((name) => [name.toLowerCase(), name]))
	for (const [name, value] of Object.entries(overrides ?? {})) {
		const previousName = names.get(name.toLowerCase())
		if (previousName) delete result[previousName]
		result[name] = value
	}
	return result
}

async function uploadMissingParts(
	file: Blob,
	signedParts: AliOSSPresignedPart[],
	session: AliOSSResumableSessionState,
	existingParts: AliOSSResumablePart[],
	options: AliOSSResumableUploadOptions,
	timeout: number,
	concurrency: number,
	cycleSignal: AbortSignal,
	uploadPart: AliOSSUploadPart
) {
	const loadedByPart = new Map(existingParts.map((part) => [part.partNumber, part.size]))
	const uploadedResponses = new Map<number, AliOSSUploadResponse>()
	const uploadController = new AbortController()
	const abortUploads = () => uploadController.abort(resolveAbortReason(cycleSignal))
	let nextPartIndex = 0

	cycleSignal.addEventListener('abort', abortUploads, { once: true })
	if (cycleSignal.aborted) abortUploads()

	const emitProgress = (partNumber?: number, partLoaded?: number, partTotal?: number) => {
		const loaded = [...loadedByPart.values()].reduce((total, value) => total + value, 0)
		options.onProgress?.(createProgress(loaded, file.size, { partNumber, partLoaded, partTotal }))
	}
	emitProgress()

	try {
		await concurrencyControl(
			async (context) => {
				const part = signedParts[nextPartIndex++]
				if (!part) {
					context.stop()
					return
				}

				const start = (part.partNumber - 1) * session.partSize
				const blob = file.slice(start, Math.min(start + session.partSize, file.size))
				const response = await uploadPart(blob, part.url, {
					headers: mergeHeaders(options.headers, part.headers),
					timeout,
					signal: uploadController.signal,
					onProgress: ({ loaded }) => {
						loadedByPart.set(part.partNumber, loaded)
						emitProgress(part.partNumber, loaded, blob.size)
					}
				})
				uploadedResponses.set(part.partNumber, response)
				loadedByPart.set(part.partNumber, blob.size)
				const uploadedPart: AliOSSResumablePart = {
					partNumber: part.partNumber,
					size: blob.size,
					etag: response.etag,
					source: 'uploaded',
					response
				}
				emitProgress(part.partNumber, blob.size, blob.size)
				options.onPartComplete?.(uploadedPart)

				if (nextPartIndex >= signedParts.length) context.stop()
			},
			Math.min(concurrency, signedParts.length)
		)
		return uploadedResponses
	} catch (error) {
		uploadController.abort(error)
		throw error
	} finally {
		cycleSignal.removeEventListener('abort', abortUploads)
	}
}

/** @internal 由 AliOSS.resumableUpload 调用。 */
export function createResumableUploadTask<TComplete>(
	file: Blob,
	handler: AliOSSResumableUploadHandler<TComplete>,
	options: AliOSSResumableUploadOptions,
	uploadPart: AliOSSUploadPart
) {
	return new AliOSSResumableUploadTask<AliOSSResumableUploadResult<TComplete>>(async (control) => {
		if (!(file instanceof Blob)) throw new TypeError('file must be a Blob or File')
		if (file.size === 0) throw new RangeError('resumable multipart upload does not support an empty file')
		if (!handler || typeof handler !== 'object') throw new TypeError('handler must be an object')
		for (const name of ['prepare', 'listParts', 'signParts', 'complete'] as const) {
			if (typeof handler[name] !== 'function') throw new TypeError(`handler.${name} must be a function`)
		}

		const requestedPartSize = validatePartSize(options.partSize ?? DEFAULT_PART_SIZE)
		const concurrency = validateConcurrency(options.concurrency ?? DEFAULT_CONCURRENCY)
		const timeout = validateTimeout(options.timeout)
		const fileInfo = createFileInfo(file)
		const baseInfo = { file, fileInfo, resumeKey: options.resumeKey }
		let session: AliOSSResumableSessionState | undefined

		try {
			while (true) {
				await control.waitForResume()
				const cycleSignal = control.beginCycle()

				try {
					control.setState('preparing')
					if (!session) {
						const prepared = await handler.prepare({ ...baseInfo, requestedPartSize, signal: cycleSignal })
						throwIfAborted(cycleSignal)
						if (!prepared || typeof prepared.uploadId !== 'string' || prepared.uploadId.length === 0) {
							throw new TypeError('handler.prepare must return a non-empty uploadId')
						}
						const partSize = validatePartSize(prepared.partSize ?? requestedPartSize)
						session = { uploadId: prepared.uploadId, partSize, partCount: Math.ceil(file.size / partSize) }
					}

					const sessionInfo = { ...baseInfo, ...session, signal: cycleSignal }
					const listedParts = await handler.listParts(sessionInfo)
					throwIfAborted(cycleSignal)
					const existingParts = normalizeExistingParts(file, listedParts, session.partSize, session.partCount)
					const existingPartNumbers = new Set(existingParts.map((part) => part.partNumber))
					const missingPartNumbers = Array.from({ length: session.partCount }, (_, index) => index + 1).filter(
						(partNumber) => !existingPartNumbers.has(partNumber)
					)

					let uploadedResponses = new Map<number, AliOSSUploadResponse>()
					if (missingPartNumbers.length > 0) {
						control.setState('uploading')
						const signedParts = validateSignedParts(
							await handler.signParts({ ...sessionInfo, partNumbers: missingPartNumbers }),
							missingPartNumbers
						)
						throwIfAborted(cycleSignal)
						uploadedResponses = await uploadMissingParts(
							file,
							signedParts,
							session,
							existingParts,
							options,
							timeout,
							concurrency,
							cycleSignal,
							uploadPart
						)
					} else {
						options.onProgress?.(createProgress(file.size, file.size))
					}

					throwIfAborted(cycleSignal)
					control.setState('preparing')
					const listedVerifiedParts = await handler.listParts(sessionInfo)
					throwIfAborted(cycleSignal)
					const verifiedParts = normalizeExistingParts(file, listedVerifiedParts, session.partSize, session.partCount)
					if (verifiedParts.length !== session.partCount) {
						throw new Error(`OSS contains ${verifiedParts.length}/${session.partCount} valid parts after upload`)
					}
					const completedParts = verifiedParts.map((part): AliOSSResumablePart => {
						const response = uploadedResponses.get(part.partNumber)
						return response ? { ...part, etag: part.etag ?? response.etag, source: 'uploaded', response } : part
					})

					control.setState('completing')
					const completeResult = await handler.complete({ ...sessionInfo, parts: completedParts })
					throwIfAborted(cycleSignal)
					return { ...session, parts: completedParts, completeResult }
				} catch (error) {
					if (control.isPaused() || error instanceof AliOSSUploadPausedError) continue
					throw error
				} finally {
					control.endCycle()
				}
			}
		} catch (error) {
			if (control.signal.aborted && handler.abort) {
				try {
					await handler.abort({ ...baseInfo, ...session, error })
				} catch (cleanupError) {
					throw new AggregateError([error, cleanupError], 'OSS resumable upload and cleanup both failed')
				}
			}
			throw error
		}
	}, options)
}
