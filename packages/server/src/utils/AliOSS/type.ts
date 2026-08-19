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

/**
 * 预签名 PUT 上传时可直接发送给 OSS 的请求头。
 *
 * 这里列出了 PutObject 最常用的标准 HTTP Header 和 `x-oss-*` Header，同时允许传入
 * `x-oss-meta-*` 等其他 OSS 支持的请求头。传入的 Header 会自动参与 V4 签名，生成 URL 后，
 * 上传方必须原样携带这些 Header。
 */
export type AliOSSUploadHeaders = Record<string, string> & {
	/** 指定 Object 下载时的缓存行为，例如 `public, max-age=31536000`。 */
	'Cache-Control'?: string
	/** 指定 Object 的展示形式，例如 `inline` 或 `attachment; filename="report.pdf"`。 */
	'Content-Disposition'?: string
	/** 声明 Object 的内容编码，例如 `gzip`、`deflate` 或 `br`。 */
	'Content-Encoding'?: string
	/** 上传内容的 Base64 MD5，用于让 OSS 校验数据完整性。 */
	'Content-MD5'?: string
	/** 指定 Object 的 MIME 类型，例如 `image/png`。 */
	'Content-Type'?: string
	/** 指定 Object 的 GMT 过期时间，例如 `Wed, 08 Jul 2026 16:57:01 GMT`。 */
	Expires?: string
	/** 是否禁止覆盖同名 Object。 */
	'x-oss-forbid-overwrite'?: 'true' | 'false'
	/** Object 访问权限。 */
	'x-oss-object-acl'?: 'default' | 'private' | 'public-read' | 'public-read-write'
	/** 对象级 WORM 保留模式。 */
	'x-oss-object-worm-mode'?: 'COMPLIANCE'
	/** 对象级 WORM 保留截止时间，使用 ISO 8601 格式。 */
	'x-oss-object-worm-retain-until-date'?: string
	/** KMS 场景下的数据加密算法。 */
	'x-oss-server-side-data-encryption'?: 'SM4'
	/** 服务端加密方式。 */
	'x-oss-server-side-encryption'?: 'AES256' | 'KMS' | 'SM4'
	/** KMS 托管的用户主密钥 ID。 */
	'x-oss-server-side-encryption-key-id'?: string
	/** Object 存储类型。 */
	'x-oss-storage-class'?: 'Standard' | 'IA' | 'Archive' | 'ColdArchive' | 'DeepColdArchive'
	/** 已按 OSS 规则编码的 Object 标签，例如 `TagA=A&TagB=B`。 */
	'x-oss-tagging'?: string
}

/**
 * 预签名 GET URL 可临时覆写的响应头。
 *
 * OSS 只支持这里列出的 5 项；出于安全原因，不支持用查询参数覆写 `Content-Type`。
 */
export interface AliOSSResponseHeaders {
	/** 覆写响应的 `Cache-Control`。 */
	'Cache-Control'?: string
	/** 覆写响应的 `Content-Disposition`。 */
	'Content-Disposition'?: string
	/** 覆写响应的 `Content-Encoding`。 */
	'Content-Encoding'?: string
	/** 覆写响应的 `Content-Language`。 */
	'Content-Language'?: string
	/** 覆写响应的 `Expires`，值应为 GMT 时间。 */
	Expires?: string
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

	/** 自定义配置 */
	config?: {
		/**
		 * 自定义请求头。
		 *
		 * 这是兼容旧调用和特殊场景的高级入口。PUT 常用请求头优先使用顶层 `headers`，
		 * 以便自动加入 `additionalHeaders`；这里的非 `Content-Type`、`Content-MD5`、`x-oss-*`
		 * Header 如需绑定签名，仍要显式写入 `additionalHeaders`。
		 */
		headers?: Record<string, string>
		/**
		 * 自定义查询参数
		 * - 通过查询参数提交响应头配置, OSS 会自动覆写响应头, 但并非所有响应头都能被覆写
		 */
		queries?: Record<string, string>
	}

	/**
	 * 指定哪些额外 Header 必须纳入签名
	 * - 之后客户端请求时就必须携带匹配的 Header，否则签名校验会失败。
	 */
	additionalHeaders?: string[]
}

/** 生成指定 OSS 文件访问签名 URL 时使用的参数。 */
export interface AliOSSAccessSignatureUrlOptions extends AliOSSFileSignatureUrlOptions {
	/**
	 * 临时覆写 GET 成功响应中的常用 Header。
	 *
	 * 工具会自动转换为 OSS 的 `response-*` 查询参数，访问 URL 时无需额外发送请求头。
	 */
	responseHeaders?: AliOSSResponseHeaders
}

/** 生成受约束的 OSS PUT 上传签名 URL 时使用的参数。 */
export interface AliOSSUploadSignatureUrlOptions extends AliOSSFileSignatureUrlOptions {
	/**
	 * 待上传文件的实际大小，单位为字节。
	 *
	 * 必须是 `0` 至 `5 GiB` 之间的安全整数。该值会作为 `Content-Length` 纳入 V4 签名中的请求头，
	 * 因此实际 PUT 请求的请求体大小必须与该值完全一致，而不只是小于某个上限。
	 */
	fileSize: number
	/**
	 * 上传时要发送给 OSS 的请求头。
	 *
	 * 所有 Header 都会自动绑定到 V4 签名；上传方必须携带相同的名称和值。浏览器禁止手动设置的
	 * `Content-Length` 不应放在这里，请继续通过 `fileSize` 指定。
	 */
	headers?: AliOSSUploadHeaders
}
