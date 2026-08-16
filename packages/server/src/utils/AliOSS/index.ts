import type {
	AliOSSOptions,
	AliOSSFileSignatureUrlOptions,
	AliOSSAccessSignatureUrlOptions,
	AliOSSUploadSignatureUrlOptions
} from './type'
import OSS from 'ali-oss'
export type * from './type'

const DEFAULT_UPLOAD_SIGNATURE_EXPIRES = 3600
const MAX_UPLOAD_SIGNATURE_EXPIRES = 7 * 24 * 60 * 60
const MAX_PUT_OBJECT_SIZE = 5 * 1024 ** 3
const MAX_OBJECT_NAME_BYTE_LENGTH = 1023
const INVALID_OBJECT_NAME_CHARACTER_REGEXP = /[\u0000-\u001f\u007f]/

/**
 * 服务端阿里云 OSS 工具。
 *
 * 客户端内部使用 V4 签名；AccessKey 不会暴露给取得预签名 URL 的上传方。
 */
export class AliOSS {
	private client: OSS
	private resolveSignatureTarget(options: AliOSSFileSignatureUrlOptions) {
		if (!options || typeof options !== 'object') {
			throw new TypeError('AliOSS signature options must be an object')
		}

		const { filename, uploadPath = '', expires = DEFAULT_UPLOAD_SIGNATURE_EXPIRES } = options

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
			uploadPath.startsWith('/') ||
			uploadPath.endsWith('/') ||
			uploadPath.includes('\\') ||
			INVALID_OBJECT_NAME_CHARACTER_REGEXP.test(uploadPath) ||
			uploadPath.split('/').some((segment) => segment.length === 0 || segment === '.' || segment === '..')
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

		return { expires, objectName }
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
	 *   expires: 300
	 * })
	 *
	 * await fetch(url, {
	 *   method: 'PUT',
	 *   body: file
	 * })
	 * ```
	 */
	generateUploadSignatureUrl(options: AliOSSUploadSignatureUrlOptions) {
		const { expires, objectName } = this.resolveSignatureTarget(options)
		const { fileSize } = options

		if (!Number.isSafeInteger(fileSize) || fileSize < 0 || fileSize > MAX_PUT_OBJECT_SIZE) {
			throw new RangeError(`fileSize must be an integer between 0 and ${MAX_PUT_OBJECT_SIZE} bytes`)
		}

		return this.client.signatureUrlV4('PUT', expires, { headers: { 'Content-Length': fileSize } }, objectName, [
			'content-length'
		])
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
	 *   expires: 300
	 * })
	 * ```
	 */
	generateAccessSignatureUrl(options: AliOSSAccessSignatureUrlOptions) {
		const { expires, objectName } = this.resolveSignatureTarget(options)
		return this.client.signatureUrlV4('GET', expires, {}, objectName)
	}
}
