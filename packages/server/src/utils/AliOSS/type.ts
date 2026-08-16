/** 创建 AliOSS 客户端所需的固定连接配置。 */
export interface AliOSSOptions {
	/** 阿里云 AccessKey ID，例如 `LTAIxxxxxxxxxxxxxxxx`。 */
	accessKeyId: string
	/** 与 `accessKeyId` 配套的 AccessKey Secret，只能保存在服务端。 */
	accessKeySecret: string
	/** OSS Bucket 名称，例如 `examplebucket`。 */
	bucket: string
	/** Bucket 所在区域，例如 `oss-cn-hangzhou`。 */
	region: string
}

/** 生成指定 OSS 文件签名 URL 时使用的通用参数。 */
export interface AliOSSFileSignatureUrlOptions {
	/**
	 * 签名 URL 的有效时长，单位为秒。
	 *
	 * 必须是 `1` 至 `604800`（7 天）之间的整数，默认值为 `3600`。
	 */
	expires?: number
	/**
	 * 对象的文件名，例如 `avatar.png`。
	 *
	 * 该值只表示文件名，不能包含 `/`、`\\`、控制字符或 `.`、`..` 路径段。
	 * 文件名会与 `uploadPath` 组合成签名绑定的完整 OSS Object Name，客户端不能通过修改 URL 更换文件名。
	 */
	filename: string
	/**
	 * 文件在 Bucket 内的相对上传目录，例如 `users/42/avatar`，默认为 Bucket 根目录。
	 *
	 * 多级目录使用 `/` 分隔；不能以 `/` 开头或结尾，不能包含反斜杠、空路径段、`.` 或 `..`。
	 * OSS 使用 Object Name 前缀模拟目录，此值不会包含 Bucket 名称。
	 */
	uploadPath?: string
}

/** 生成指定 OSS 文件访问签名 URL 时使用的参数。 */
export type AliOSSAccessSignatureUrlOptions = AliOSSFileSignatureUrlOptions

/** 生成受约束的 OSS PUT 上传签名 URL 时使用的参数。 */
export interface AliOSSUploadSignatureUrlOptions extends AliOSSFileSignatureUrlOptions {
	/**
	 * 待上传文件的实际大小，单位为字节。
	 *
	 * 必须是 `0` 至 `5 GiB` 之间的安全整数。该值会作为 `Content-Length` 纳入 V4 签名，
	 * 因此实际 PUT 请求的请求体大小必须与该值完全一致，而不只是小于某个上限。
	 */
	fileSize: number
}
