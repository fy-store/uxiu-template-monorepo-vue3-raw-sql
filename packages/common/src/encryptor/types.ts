import type { EncryptorError } from './index'

export type BinaryReadable = ReadableStream<Uint8Array> | AsyncIterable<Uint8Array>

export interface EncryptorOptions {
	/** 密钥, 用于加密和解密 */
	key: string
	/**
	 * Argon2id 参数
	 * - 建议保持默认配置
	 */
	argon2id?: Argon2idOptions
}

export interface Argon2idOptions {
	/** 迭代次数 */
	t?: number
	/** 内存成本（KiB） */
	m?: number
	/** 并行度 */
	p?: number
	/** 派生长度（字节） */
	dkLen?: number
}

export interface EncryptionArrayBufferOptions {
	/**
	 * 明文
	 * - 该信息将被放在加密后数据的前端, 主要用途是为了在解密前获取到一些信息
	 * - 该信息将被签名, 以防止篡改
	 */
	plaintext?: string
	/**
	 * 密文
	 * - 该信息将被放在加密后数据的前端, 主要用途是为了在解密一些大资源时可以先获取到一些信息, 以决定是否需要继续解析剩余数据
	 * - 当有一些元数据不希望被明文暴露时, 可以放在这里
	 */
	ciphertext?: string
}

export interface EncryptFileOptions {
	/**
	 * 明文元数据
	 */
	plaintext?: string
	/**
	 * 额外密文元数据，会和文件元信息一起写入密文元数据
	 */
	ciphertextMeta?: Record<string, unknown>
	/**
	 * 加密后输出文件名（默认不会暴露原始文件名）
	 */
	outputFileName?: string
}

export interface DecryptFileOptions {
	/**
	 * 解密后输出文件名（优先级最高）
	 */
	outputFileName?: string
	/**
	 * 当密文元数据里没有文件名时使用的回退文件名
	 */
	fallbackFileName?: string
}

export interface EncryptFileCiphertextMeta {
	/** 元信息类型标识 */
	type: 'encryptor-file-meta'
	/** 元信息版本 */
	version: 1
	/** 原始文件名 */
	name: string
	/** 原始扩展名（无点） */
	extension: string
	/** 原始 MIME 类型 */
	mimeType: string
	/** 原始文件大小 */
	size: number
	/** 原始最后修改时间 */
	lastModified: number
	/** 用户传入的额外密文元数据 */
	extra?: Record<string, unknown>
}

/**
 * 文件流加密选项
 */
export interface EncryptFileStreamOptions extends EncryptFileOptions {}

/**
 * 文件流解密选项
 */
export interface DecryptFileStreamOptions extends DecryptFileOptions {}

export interface EncryptorEvents {
	/**
	 * 明文签名事件
	 * @param signedData 签名后的数据
	 * @param originData 原始明文数据
	 */
	'encrypt:plaintext'?(signedData: ArrayBuffer, originData: string): void
	/**
	 * 密文加密事件
	 * @param encryptedData 加密后的数据
	 * @param originData 原始密文数据
	 */
	'encrypt:ciphertext'?(encryptedData: ArrayBuffer, originData: string): void
	/**
	 * 数据加密分块事件
	 * - 加密将被切分为多块, 每块加密完成后将触发该事件
	 * - `plaintext` 和 `ciphertext` 的签名或加密结果请监听 `encrypt:plaintext` 和 `encrypt:ciphertext` 事件
	 * @param encryptedChunk 加密后的分块数据
	 * @param originChunk 原始分块数据
	 */
	'encrypt:chunk'?(encryptedChunk: ArrayBuffer, originChunk: ArrayBuffer): void
	/**
	 * 加密完成事件
	 */
	'encrypt:finish'?(): void
	/**
	 * 加密错误事件
	 * @param error 错误信息
	 */
	'encrypt:error'?(error: EncryptorError): void

	/**
	 * 明文签名验证通过事件
	 * @param signedData 签名后的数据
	 * @param originData 原始明文数据
	 */
	'decrypt:plaintext'?(signedData: ArrayBuffer, originData: string): void
	/**
	 * 密文解密事件
	 * @param decryptedData 解密后的数据
	 * @param originData 原始密文数据
	 */
	'decrypt:ciphertext'?(decryptedData: ArrayBuffer, originData: string): void
	/**
	 * 数据解密分块事件
	 * - 解密将被切分为多块, 每块解密完成后将触发该事件
	 * - `plaintext` 和 `ciphertext` 的签名或解密结果请监听 `decrypt:plaintext` 和 `decrypt:ciphertext` 事件
	 * @param decryptedChunk 解密后的分块数据
	 * @param originChunk 原始分块数据
	 */
	'decrypt:chunk'?(decryptedChunk: ArrayBuffer, originChunk: ArrayBuffer): void
	/**
	 * 解密完成事件
	 */
	'decrypt:finish'?(): void
	/**
	 * 解密错误事件
	 * @param error 错误信息
	 */
	'decrypt:error'?(error: EncryptorError): void
}
