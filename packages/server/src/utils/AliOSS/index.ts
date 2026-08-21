import type {
	AliOSSOptions,
	AliOSSFileSignatureUrlOptions,
	AliOSSAccessSignatureUrlOptions,
	AliOSSUploadSignatureUrlOptions,
	AliOSSResponseHeaders,
	AliOSSInitMultipartUploadOptions,
	AliOSSUploadPartSignatureUrlOptions,
	AliOSSMultipartPart,
	AliOSSCompleteMultipartUploadResult
} from './type'
import OSS from 'ali-oss'
export type * from './type'

const DEFAULT_UPLOAD_SIGNATURE_EXPIRES = 3600
const MAX_UPLOAD_SIGNATURE_EXPIRES = 7 * 24 * 60 * 60
const MAX_PUT_OBJECT_SIZE = 5 * 1024 ** 3
const MAX_MULTIPART_PART_NUMBER = 10000
const MAX_OBJECT_NAME_BYTE_LENGTH = 1023
const INVALID_OBJECT_NAME_CHARACTER_REGEXP = /[\u0000-\u001f\u007f]/
const HTTP_HEADER_NAME_REGEXP = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/
const INVALID_HTTP_HEADER_VALUE_REGEXP = /[\r\n]/
const RESPONSE_HEADER_QUERY_MAP = {
	'cache-control': 'response-cache-control',
	'content-disposition': 'response-content-disposition',
	'content-encoding': 'response-content-encoding',
	'content-language': 'response-content-language',
	expires: 'response-expires'
} as const

function normalizeMultipartParts(rawParts: unknown) {
	const values = Array.isArray(rawParts) ? rawParts : rawParts ? [rawParts] : []
	return values.map((rawPart, index): AliOSSMultipartPart => {
		if (typeof rawPart !== 'object' || rawPart === null || Array.isArray(rawPart)) {
			throw new TypeError(`OSS ListParts returned an invalid part at index ${index}`)
		}

		const part = rawPart as Record<string, unknown>
		const partNumber = Number(part.PartNumber)
		const size = Number(part.Size ?? part.size)
		const etag = part.ETag
		if (!Number.isSafeInteger(partNumber) || partNumber < 1 || partNumber > MAX_MULTIPART_PART_NUMBER) {
			throw new TypeError(`OSS ListParts returned an invalid PartNumber at index ${index}`)
		}
		if (!Number.isSafeInteger(size) || size < 0) {
			throw new TypeError(`OSS ListParts returned an invalid Size at index ${index}`)
		}
		if (typeof etag !== 'string' || etag.length === 0) {
			throw new TypeError(`OSS ListParts returned an invalid ETag at index ${index}`)
		}

		return { partNumber, size, etag }
	})
}

/**
 * 服务端阿里云 OSS 工具。
 *
 * 客户端内部使用 V4 签名；AccessKey 不会暴露给取得预签名 URL 的上传方。
 *
 * 文档: https://help.aliyun.com/zh/oss/user-guide/upload-files-using-presigned-urls
 */
export class AliOSS {
	private client: OSS

	private resolveHeaders(headers: unknown, optionName: string) {
		if (headers === undefined) return {}
		if (!(typeof headers === 'object' && headers !== null && !Array.isArray(headers))) {
			throw new TypeError(`${optionName} must be an object`)
		}

		const resolvedHeaders: Record<string, string> = {}
		const lowercaseHeaderNames = new Set<string>()
		for (const [name, value] of Object.entries(headers)) {
			if (!HTTP_HEADER_NAME_REGEXP.test(name)) {
				throw new TypeError(`${optionName} contains an invalid HTTP header name: ${name}`)
			}
			if (value === undefined) continue
			if (typeof value !== 'string') {
				throw new TypeError(`${optionName}.${name} must be a string`)
			}
			if (INVALID_HTTP_HEADER_VALUE_REGEXP.test(value)) {
				throw new TypeError(`${optionName}.${name} must not contain CR or LF characters`)
			}

			const lowercaseName = name.toLowerCase()
			if (lowercaseHeaderNames.has(lowercaseName)) {
				throw new TypeError(`${optionName} contains duplicate HTTP header names: ${name}`)
			}
			lowercaseHeaderNames.add(lowercaseName)
			resolvedHeaders[name] = value
		}

		return resolvedHeaders
	}

	private resolveResponseHeaderQueries(responseHeaders: AliOSSResponseHeaders | undefined) {
		const headers = this.resolveHeaders(responseHeaders, 'responseHeaders')
		const queries: Record<string, string> = {}
		for (const [name, value] of Object.entries(headers)) {
			const queryName = RESPONSE_HEADER_QUERY_MAP[name.toLowerCase() as keyof typeof RESPONSE_HEADER_QUERY_MAP]
			if (!queryName) {
				throw new TypeError(`responseHeaders does not support overriding ${name}`)
			}
			queries[queryName] = value
		}
		return queries
	}

	private resolveSignatureTarget(options: AliOSSFileSignatureUrlOptions) {
		if (!options || typeof options !== 'object') {
			throw new TypeError('AliOSS signature options must be an object')
		}

		const {
			filename,
			uploadPath = '',
			expires = DEFAULT_UPLOAD_SIGNATURE_EXPIRES,
			config = {},
			additionalHeaders = []
		} = options

		if (typeof filename !== 'string' || filename.trim().length === 0) {
			throw new TypeError('filename must be a non-empty string')
		}
		if (
			filename === '.' ||
			filename === '..' ||
			filename.includes('/') ||
			filename.includes('\\') ||
			INVALID_OBJECT_NAME_CHARACTER_REGEXP.test(filename)
		) {
			throw new Error('filename contains an invalid character or path segment')
		}

		if (typeof uploadPath !== 'string') {
			throw new TypeError('uploadPath must be a string')
		}
		if (
			uploadPath !== '' &&
			(uploadPath.startsWith('/') ||
				uploadPath.endsWith('/') ||
				uploadPath.includes('\\') ||
				INVALID_OBJECT_NAME_CHARACTER_REGEXP.test(uploadPath) ||
				uploadPath.split('/').some((segment) => segment.length === 0 || segment === '.' || segment === '..'))
		) {
			throw new Error('uploadPath must be a relative OSS path without empty, current, or parent segments')
		}

		if (!Number.isInteger(expires) || expires < 1 || expires > MAX_UPLOAD_SIGNATURE_EXPIRES) {
			throw new RangeError(`expires must be an integer between 1 and ${MAX_UPLOAD_SIGNATURE_EXPIRES} seconds`)
		}

		const objectName = uploadPath ? `${uploadPath}/${filename}` : filename
		if (Buffer.byteLength(objectName, 'utf8') > MAX_OBJECT_NAME_BYTE_LENGTH) {
			throw new RangeError(`OSS object name must not exceed ${MAX_OBJECT_NAME_BYTE_LENGTH} UTF-8 bytes`)
		}

		if (!(typeof config === 'object' && config !== null && !Array.isArray(config))) {
			throw new TypeError('config must be an object')
		}

		if (!Array.isArray(additionalHeaders)) {
			throw new TypeError('additionalHeaders must be an array of strings')
		}

		const configHeaders = this.resolveHeaders(config.headers, 'config.headers')
		if (
			!(
				config.queries === undefined ||
				(typeof config.queries === 'object' && config.queries !== null && !Array.isArray(config.queries))
			)
		) {
			throw new TypeError('config.queries must be an object')
		}
		const configQueries: Record<string, string> = {}
		for (const [name, value] of Object.entries(config.queries ?? {})) {
			if (typeof value !== 'string') {
				throw new TypeError(`config.queries.${name} must be a string`)
			}
			configQueries[name] = value
		}

		for (const header of additionalHeaders) {
			if (typeof header !== 'string' || !HTTP_HEADER_NAME_REGEXP.test(header)) {
				throw new TypeError('additionalHeaders must contain valid HTTP header names')
			}
		}

		return {
			expires,
			objectName,
			configHeaders,
			configQueries,
			additionalHeaders
		}
	}

	/**
	 * 创建一个绑定到指定 Region 和 Bucket 的 OSS 客户端。
	 *
	 * @param options OSS 连接配置。AccessKey 应具备目标 Bucket 所需的最小权限。
	 */
	constructor(options: AliOSSOptions) {
		const { accessKeyId, accessKeySecret, bucket, region } = options
		this.client = new OSS({
			accessKeyId,
			accessKeySecret,
			bucket,
			region,
			authorizationV4: true
		})
	}

	/**
	 * 生成一个受文件大小、文件名和上传目录约束的 V4 预签名 PUT URL。
	 *
	 * 最终 Object Name 为 `uploadPath/filename`；未提供 `uploadPath` 时直接使用 `filename`。
	 * Object Name 和 `Content-Length` 都参与签名，上传方修改目标位置、文件名或实际上传大小后，
	 * OSS 的签名校验将无法通过。
	 *
	 * 浏览器使用 `File` 或 `Blob` 作为请求体时会自动发送 `Content-Length`，不要在前端手动设置该请求头；
	 * Node.js HTTP 客户端则应确保请求的 `Content-Length` 与 `fileSize` 完全一致。
	 *
	 * 预签名 URL 在过期前不是一次性的：持有者可以对同一 Object Name 重复执行 PUT，并可能覆盖已有对象。
	 * 调用方应缩短有效期、限制 URL 的传播范围，并在不允许覆盖时额外设计对象名唯一性或 Bucket 策略。
	 *
	 * @param options 上传限制与签名有效期。
	 * @returns 可直接用于 HTTP PUT 请求的 V4 预签名 URL。
	 * @throws {TypeError} 参数类型错误，或文件名为空。
	 * @throws {RangeError} 文件大小、有效期或完整 Object Name 长度超出 OSS 支持范围。
	 * @throws {Error} 文件名或上传目录包含非法路径内容。
	 *
	 * @example
	 * ```ts
	 * const url = await aliOSS.generateUploadSignatureUrl({
	 *   filename: file.name,
	 *   uploadPath: `users/${userId}`,
	 *   fileSize: file.size,
	 *   expires: 300,
	 *   headers: {
	 *     'Content-Type': file.type,
	 *     'Cache-Control': 'private, no-cache',
	 *     'x-oss-forbid-overwrite': 'true'
	 *   }
	 * })
	 *
	 * await fetch(url, {
	 *   method: 'PUT',
	 *   headers: {
	 *     'Content-Type': file.type,
	 *     'Cache-Control': 'private, no-cache',
	 *     'x-oss-forbid-overwrite': 'true'
	 *   },
	 *   body: file
	 * })
	 * ```
	 */
	generateUploadSignatureUrl(options: AliOSSUploadSignatureUrlOptions) {
		const { expires, objectName, configHeaders, configQueries, additionalHeaders } =
			this.resolveSignatureTarget(options)
		const { fileSize } = options

		if (!Number.isSafeInteger(fileSize) || fileSize < 0 || fileSize > MAX_PUT_OBJECT_SIZE) {
			throw new RangeError(`fileSize must be an integer between 0 and ${MAX_PUT_OBJECT_SIZE} bytes`)
		}

		const uploadHeaders = this.resolveHeaders(options.headers, 'headers')
		if (Object.keys(uploadHeaders).some((name) => name.toLowerCase() === 'content-length')) {
			throw new TypeError('headers.Content-Length is managed by fileSize and must not be set manually')
		}
		if (Object.keys(configHeaders).some((name) => name.toLowerCase() === 'content-length')) {
			throw new TypeError('config.headers.Content-Length is managed by fileSize and must not be set manually')
		}

		const headers = {
			...uploadHeaders,
			...configHeaders,
			'Content-Length': fileSize
		}
		const signedUploadHeaders = Object.keys(uploadHeaders).map((name) => name.toLowerCase())
		return this.client.signatureUrlV4('PUT', expires, { headers, queries: configQueries }, objectName, [
			'content-length',
			...signedUploadHeaders,
			...additionalHeaders
		])
	}

	/**
	 * 初始化 Multipart Upload。
	 *
	 * @param options OSS Object 名称、目录和最终 Object Header。
	 * @returns UploadId 和完整 Object Name。
	 */
	async initMultipartUpload(options: AliOSSInitMultipartUploadOptions) {
		const { objectName, configHeaders } = this.resolveSignatureTarget(options)
		const uploadHeaders = this.resolveHeaders(options.headers, 'headers')
		const result = await this.client.initMultipartUpload(objectName, {
			headers: { ...uploadHeaders, ...configHeaders }
		})
		return {
			uploadId: result.uploadId,
			objectName: result.name
		}
	}

	/**
	 * 为指定 Multipart Upload 分片生成受大小约束的 V4 PUT 预签名 URL。
	 *
	 * @param options Object、UploadId、partNumber、分片大小及签名 Header。
	 * @returns 可直接 PUT 对应分片二进制的预签名 URL。
	 */
	generateUploadPartSignatureUrl(options: AliOSSUploadPartSignatureUrlOptions) {
		const { expires, objectName, configHeaders, configQueries, additionalHeaders } =
			this.resolveSignatureTarget(options)
		const { fileSize, uploadId, partNumber } = options

		if (!Number.isSafeInteger(fileSize) || fileSize < 1 || fileSize > MAX_PUT_OBJECT_SIZE) {
			throw new RangeError(`fileSize must be an integer between 1 and ${MAX_PUT_OBJECT_SIZE} bytes`)
		}
		if (typeof uploadId !== 'string' || uploadId.length === 0) {
			throw new TypeError('uploadId must be a non-empty string')
		}
		if (!Number.isSafeInteger(partNumber) || partNumber < 1 || partNumber > MAX_MULTIPART_PART_NUMBER) {
			throw new RangeError(`partNumber must be an integer between 1 and ${MAX_MULTIPART_PART_NUMBER}`)
		}

		const uploadHeaders = this.resolveHeaders(options.headers, 'headers')
		if (
			[...Object.keys(uploadHeaders), ...Object.keys(configHeaders)].some(
				(name) => name.toLowerCase() === 'content-length'
			)
		) {
			throw new TypeError('Content-Length is managed by fileSize and must not be set manually')
		}

		const headers = { ...uploadHeaders, ...configHeaders, 'Content-Length': fileSize }
		const signedUploadHeaders = Object.keys(uploadHeaders).map((name) => name.toLowerCase())
		return this.client.signatureUrlV4(
			'PUT',
			expires,
			{
				headers,
				queries: {
					...configQueries,
					partNumber: String(partNumber),
					uploadId
				}
			},
			objectName,
			['content-length', ...signedUploadHeaders, ...additionalHeaders]
		)
	}

	/**
	 * 列出指定 Multipart Upload 的全部已上传分片。
	 *
	 * SDK 单次最多返回 1000 项，本方法会自动读取后续分页。
	 *
	 * @param objectName 完整 OSS Object Name。
	 * @param uploadId Multipart Upload ID。
	 * @returns 按 partNumber 升序排列的全部分片。
	 */
	async listMultipartUploadParts(objectName: string, uploadId: string) {
		const parts: AliOSSMultipartPart[] = []
		let marker = 0

		while (true) {
			const result = await this.client.listParts(objectName, uploadId, {
				'max-parts': 1000,
				'part-number-marker': marker,
				'encoding-type': 'url'
			})
			// ali-oss 直接暴露 xml2js 的结果：单个 Part 是对象，多个 Part 才是数组，数值也是字符串。
			parts.push(...normalizeMultipartParts(result.parts))

			const isTruncated: unknown = result.isTruncated
			if (isTruncated !== true && isTruncated !== 'true') break
			const nextMarker = Number(result.nextPartNumberMarker)
			if (!Number.isSafeInteger(nextMarker) || nextMarker <= marker) {
				throw new TypeError('OSS ListParts returned an invalid NextPartNumberMarker')
			}
			marker = nextMarker
		}

		return parts.sort((a, b) => a.partNumber - b.partNumber)
	}

	/**
	 * 合并指定 Multipart Upload 的全部分片。
	 *
	 * @param objectName 完整 OSS Object Name。
	 * @param uploadId Multipart Upload ID。
	 * @param parts 已校验并按编号排列的分片列表。
	 */
	async completeMultipartUpload(
		objectName: string,
		uploadId: string,
		parts: AliOSSMultipartPart[]
	): Promise<AliOSSCompleteMultipartUploadResult> {
		const result = await this.client.completeMultipartUpload(
			objectName,
			uploadId,
			parts.map((part) => ({ number: part.partNumber, etag: part.etag }))
		)
		return {
			bucket: result.bucket,
			objectName: result.name,
			etag: result.etag
		}
	}

	/**
	 * 终止 Multipart Upload 并由 OSS 删除已上传但未合并的分片。
	 *
	 * @param objectName 完整 OSS Object Name。
	 * @param uploadId Multipart Upload ID。
	 */
	abortMultipartUpload(objectName: string, uploadId: string) {
		return this.client.abortMultipartUpload(objectName, uploadId)
	}

	/**
	 * 生成指定文件的 V4 预签名 GET 访问 URL。
	 *
	 * 最终 Object Name 为 `uploadPath/filename`；未提供 `uploadPath` 时直接使用 `filename`。
	 * URL 只能访问签名绑定的这个 Object Name，修改文件名、目录或签名参数后 OSS 将拒绝请求。
	 *
	 * 此方法只在本地计算签名，不会请求 OSS，也不会检查指定文件是否存在。预签名 URL 属于临时访问凭证，
	 * 任何持有者在过期前都可以读取目标文件，因此调用方应使用尽可能短的有效期并限制 URL 的传播范围。
	 *
	 * @param options 文件名、文件所在目录和签名有效期。
	 * @returns 可直接用于 HTTP GET 请求、浏览器地址或资源 `src` 属性的 V4 预签名 URL。
	 * @throws {TypeError} 参数类型错误，或文件名为空。
	 * @throws {RangeError} 有效期或完整 Object Name 长度超出 OSS 支持范围。
	 * @throws {Error} 文件名或文件目录包含非法路径内容。
	 *
	 * @example
	 * ```ts
	 * const url = await aliOSS.generateAccessSignatureUrl({
	 *   filename: 'avatar.png',
	 *   uploadPath: `users/${userId}`,
	 *   expires: 300,
	 *   responseHeaders: {
	 *     'Cache-Control': 'private, no-cache',
	 *     'Content-Disposition': 'inline'
	 *   }
	 * })
	 * ```
	 */
	generateAccessSignatureUrl(options: AliOSSAccessSignatureUrlOptions) {
		const { expires, objectName, configHeaders, configQueries, additionalHeaders } =
			this.resolveSignatureTarget(options)
		const responseHeaderQueries = this.resolveResponseHeaderQueries(options.responseHeaders)
		return this.client.signatureUrlV4(
			'GET',
			expires,
			{
				headers: configHeaders,
				queries: { ...responseHeaderQueries, ...configQueries }
			},
			objectName,
			additionalHeaders
		)
	}
}
