import { isObject, isString } from 'uxiu/utils'
import { Bus, type InterfaceToType } from 'event-imt'
import { argon2id } from '@noble/hashes/argon2.js'
import type {
	EncryptorOptions,
	EncryptorEvents,
	BinaryReadable,
	EncryptionArrayBufferOptions,
	EncryptFileCiphertextMeta,
	EncryptFileOptions,
	EncryptFileStreamOptions,
	DecryptFileStreamOptions,
	DecryptFileOptions,
	Argon2idOptions
} from './types'

export type * from './types'

export const encryptorErrorCodes = {
	/** 加密错误 */
	ENCRYPTION_ERROR: 1,
	/** 解密错误 */
	DECRYPTION_ERROR: 2,
	/** 明文验证失败错误 */
	PLAINTEXT_VERIFICATION_FAILED: 3,
	/** 配置参数错误 */
	INVALID_OPTIONS: 4,
	/** 任务被取消 */
	CANCELED: 5,
	/** 当前已有任务在运行 */
	ALREADY_RUNNING: 6,
	/** 运行环境不支持所需能力 */
	UNSUPPORTED_ENVIRONMENT: 7,
	/** 输入流类型不支持 */
	INVALID_STREAM_INPUT: 8,
	/** 文件输入类型错误 */
	INVALID_FILE_INPUT: 9
}

export class EncryptorError extends Error {
	code
	/**
	 * 加解密错误对象
	 * @param message 错误消息
	 * @param code 错误码
	 */
	constructor(message: string, code: number) {
		super(message)
		this.code = code
	}
}

/** 加解密器 */
export class Encryptor {
	/**
	 * 事件总线
	 * - 用于监听加密/解密过程中的阶段事件
	 */
	readonly bus = new Bus<InterfaceToType<EncryptorEvents>>()
	private _key: string
	private _isRunning = false
	private _cancelRequested = false
	private _argon2id: Required<Argon2idOptions>

	private readonly _encoder = new TextEncoder()
	private readonly _decoder = new TextDecoder()

	private static readonly _MAGIC = [0x55, 0x58, 0x45, 0x4e] as const
	private static readonly _VERSION = 2
	private static readonly _FORMAT_FLAG = 0xa1
	private static readonly _CHUNK_SIZE = 64 * 1024
	private static readonly _KDF_SALT_LENGTH = 16
	private static readonly _KDF_KEY_LENGTH = 64
	private static readonly _KDF_DEFAULT = {
		t: 3,
		m: 19456,
		p: 1,
		dkLen: Encryptor._KDF_KEY_LENGTH
	} as const

	/**
	 * 当前是否处于加解密执行中
	 */
	get isRunning() {
		return this._isRunning
	}

	/**
	 * 加解密器
	 * @param options 配置选项
	 */
	constructor(options: EncryptorOptions) {
		if (!isObject(options)) {
			throw new EncryptorError('options must be an object', encryptorErrorCodes.INVALID_OPTIONS)
		}
		if (!isString(options.key)) {
			throw new EncryptorError('options.key must be a string', encryptorErrorCodes.INVALID_OPTIONS)
		}

		const mergedArgon2id = {
			...Encryptor._KDF_DEFAULT,
			...(isObject(options.argon2id) ? options.argon2id : {})
		}

		if (
			!Number.isInteger(mergedArgon2id.t) ||
			!Number.isInteger(mergedArgon2id.m) ||
			!Number.isInteger(mergedArgon2id.p) ||
			!Number.isInteger(mergedArgon2id.dkLen) ||
			mergedArgon2id.t < 1 ||
			mergedArgon2id.m < 8 * 1024 ||
			mergedArgon2id.p < 1 ||
			mergedArgon2id.dkLen < 64
		) {
			throw new EncryptorError(
				'options.argon2id must provide valid integer values: t>=1, m>=8192, p>=1, dkLen>=64',
				encryptorErrorCodes.INVALID_OPTIONS
			)
		}

		this._key = options.key
		this._argon2id = mergedArgon2id
	}

	/**
	 * 设置运行状态
	 * @param state 运行状态
	 */
	private _setRunning(state: boolean) {
		this._isRunning = state
	}

	/**
	 * 标记并检测取消状态
	 */
	private _throwIfCancelled() {
		if (this._cancelRequested) {
			throw new EncryptorError('Encryptor operation canceled', encryptorErrorCodes.CANCELED)
		}
	}

	/**
	 * 统一输入流，兼容 ReadableStream 与 AsyncIterable
	 */
	private _toReadableStream(stream: BinaryReadable) {
		if (stream && typeof (stream as ReadableStream<Uint8Array>).getReader === 'function') {
			return stream as ReadableStream<Uint8Array>
		}

		if (stream && typeof (stream as AsyncIterable<Uint8Array>)[Symbol.asyncIterator] === 'function') {
			if (typeof ReadableStream === 'undefined') {
				throw new EncryptorError(
					'ReadableStream is not available in current environment',
					encryptorErrorCodes.UNSUPPORTED_ENVIRONMENT
				)
			}
			const iterator = (stream as AsyncIterable<Uint8Array>)[Symbol.asyncIterator]()
			return new ReadableStream<Uint8Array>({
				pull: async (controller) => {
					const { done, value } = await iterator.next()
					if (done) {
						controller.close()
						return
					}
					controller.enqueue(value instanceof Uint8Array ? value : new Uint8Array(value))
				},
				cancel: async () => {
					if (typeof iterator.return === 'function') {
						await iterator.return()
					}
				}
			})
		}

		throw new EncryptorError(
			'stream must be ReadableStream<Uint8Array> or AsyncIterable<Uint8Array>',
			encryptorErrorCodes.INVALID_STREAM_INPUT
		)
	}

	/**
	 * 基于 Argon2id + salt 派生并导入 AES/HMAC 密钥
	 * @param salt 每个密文唯一盐值
	 * @returns 派生后的 AES 与 HMAC 密钥
	 */
	private async _deriveKeys(salt: Uint8Array) {
		const keyMaterial = argon2id(this._encoder.encode(this._key), salt, this._argon2id)

		const aesRaw = keyMaterial.slice(0, 32)
		const hmacRaw = keyMaterial.slice(32, 64)

		const aesKey = await globalThis.crypto.subtle.importKey('raw', aesRaw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
		const hmacKey = await globalThis.crypto.subtle.importKey(
			'raw',
			hmacRaw,
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['sign', 'verify']
		)

		return { aesKey, hmacKey }
	}

	/**
	 * 将 uint32 数值编码为 4 字节
	 * @param value 数值
	 * @returns 4 字节数组
	 */
	private _u32ToBytes(value: number) {
		const out = new Uint8Array(4)
		new DataView(out.buffer).setUint32(0, value)
		return out
	}

	/**
	 * 从字节数组指定偏移读取 uint32
	 * @param bytes 源字节数组
	 * @param offset 偏移量
	 * @returns 读取到的无符号 32 位整数
	 */
	private _bytesToU32(bytes: Uint8Array, offset: number) {
		if (offset + 4 > bytes.length) {
			throw new EncryptorError('Invalid encrypted payload structure', encryptorErrorCodes.DECRYPTION_ERROR)
		}
		return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0)
	}

	/**
	 * 拼接多个字节数组
	 * @param chunks 字节块列表
	 * @returns 拼接后的字节数组
	 */
	private _concatBytes(chunks: Uint8Array[]) {
		const total = chunks.reduce((sum, item) => sum + item.length, 0)
		const out = new Uint8Array(total)
		let offset = 0
		for (const chunk of chunks) {
			out.set(chunk, offset)
			offset += chunk.length
		}
		return out
	}

	/**
	 * 将字节数组转换为十六进制字符串
	 * @param bytes 字节数组
	 * @returns 十六进制字符串
	 */
	private _toHex(bytes: Uint8Array) {
		return Array.from(bytes)
			.map((item) => item.toString(16).padStart(2, '0'))
			.join('')
	}

	/**
	 * 将任意 Uint8Array 规范为基于 ArrayBuffer 的 Uint8Array
	 * @param bytes 源字节数组
	 * @returns 规范化后的字节数组
	 */
	private _toArrayBufferBackedBytes(bytes: Uint8Array) {
		const normalized = new Uint8Array(bytes.byteLength)
		normalized.set(bytes)
		return normalized
	}

	/**
	 * 规范化未知错误为 EncryptorError
	 * @param error 原始错误
	 * @param encryption 是否为加密流程错误
	 * @returns 规范化后的错误对象
	 */
	private _normalizeError(error: unknown, encryption = true) {
		if (error instanceof EncryptorError) {
			return error
		}
		return new EncryptorError(
			error instanceof Error ? error.message : String(error),
			encryption ? encryptorErrorCodes.ENCRYPTION_ERROR : encryptorErrorCodes.DECRYPTION_ERROR
		)
	}

	/**
	 * 加密二进制数据
	 * @param buffer 待加密数据
	 * @param options 加密附加选项（明文/密文元数据）
	 * @returns 加密后的封包数据
	 */
	async encryptArrayBuffer(buffer: ArrayBuffer, options: EncryptionArrayBufferOptions = {}) {
		if (this.isRunning) {
			throw new EncryptorError('Encryptor is running', encryptorErrorCodes.ALREADY_RUNNING)
		}

		this._cancelRequested = false
		this._setRunning(true)

		try {
			this._throwIfCancelled()
			const runtimeCrypto = globalThis.crypto
			const salt = runtimeCrypto.getRandomValues(new Uint8Array(Encryptor._KDF_SALT_LENGTH))
			const { aesKey, hmacKey } = await this._deriveKeys(salt)
			this._throwIfCancelled()

			const source = new Uint8Array(buffer)
			const plaintext = options.plaintext ?? ''
			const ciphertextText = options.ciphertext ?? ''

			const plaintextBytes = this._encoder.encode(plaintext)
			this._throwIfCancelled()
			const plaintextSignature = new Uint8Array(await runtimeCrypto.subtle.sign('HMAC', hmacKey, plaintextBytes))
			if (this.bus.has('encrypt:plaintext')) {
				this.bus.emit('encrypt:plaintext', plaintextSignature.buffer.slice(0), plaintext)
			}

			const ciphertextOriginBytes = this._encoder.encode(ciphertextText)
			const ciphertextIv = runtimeCrypto.getRandomValues(new Uint8Array(12))
			this._throwIfCancelled()
			const ciphertextEncrypted = new Uint8Array(
				await runtimeCrypto.subtle.encrypt({ name: 'AES-GCM', iv: ciphertextIv }, aesKey, ciphertextOriginBytes)
			)
			if (this.bus.has('encrypt:ciphertext')) {
				this.bus.emit('encrypt:ciphertext', ciphertextEncrypted.buffer.slice(0), ciphertextText)
			}

			const encryptedChunks: Uint8Array[] = []
			for (let start = 0; start < source.length; start += Encryptor._CHUNK_SIZE) {
				this._throwIfCancelled()
				const chunk = source.slice(start, Math.min(start + Encryptor._CHUNK_SIZE, source.length))
				const iv = runtimeCrypto.getRandomValues(new Uint8Array(12))
				const encryptedChunk = new Uint8Array(
					await runtimeCrypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, chunk)
				)
				encryptedChunks.push(this._u32ToBytes(iv.length), iv, this._u32ToBytes(encryptedChunk.length), encryptedChunk)
				if (this.bus.has('encrypt:chunk')) {
					this.bus.emit('encrypt:chunk', encryptedChunk.buffer.slice(0), chunk.buffer.slice(0))
				}
			}

			const encryptedPart = this._concatBytes(encryptedChunks)
			this._throwIfCancelled()
			const payload = this._concatBytes([
				new Uint8Array(Encryptor._MAGIC),
				new Uint8Array([Encryptor._VERSION]),
				new Uint8Array([Encryptor._FORMAT_FLAG]),
				this._u32ToBytes(salt.length),
				salt,
				this._u32ToBytes(plaintextBytes.length),
				plaintextBytes,
				this._u32ToBytes(plaintextSignature.length),
				plaintextSignature,
				this._u32ToBytes(ciphertextIv.length),
				ciphertextIv,
				this._u32ToBytes(ciphertextEncrypted.length),
				ciphertextEncrypted,
				encryptedPart
			])

			if (this.bus.has('encrypt:finish')) {
				this.bus.emit('encrypt:finish')
			}
			return payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength)
		} catch (error) {
			const normalized = this._normalizeError(error, true)
			if (this.bus.has('encrypt:error')) {
				this.bus.emit('encrypt:error', normalized)
			}
			throw normalized
		} finally {
			this._setRunning(false)
			this._cancelRequested = false
		}
	}

	/**
	 * 解密二进制封包数据
	 * @param buffer 加密封包数据
	 * @returns 解密后的原始二进制数据
	 */
	async decryptArrayBuffer(buffer: ArrayBuffer) {
		if (this.isRunning) {
			throw new EncryptorError('Encryptor is running', encryptorErrorCodes.ALREADY_RUNNING)
		}

		this._cancelRequested = false
		this._setRunning(true)

		try {
			this._throwIfCancelled()
			const runtimeCrypto = globalThis.crypto
			const bytes = new Uint8Array(buffer)
			this._throwIfCancelled()

			if (bytes.length < 10) {
				throw new EncryptorError('Invalid encrypted payload', encryptorErrorCodes.DECRYPTION_ERROR)
			}

			if (
				bytes[0] !== Encryptor._MAGIC[0] ||
				bytes[1] !== Encryptor._MAGIC[1] ||
				bytes[2] !== Encryptor._MAGIC[2] ||
				bytes[3] !== Encryptor._MAGIC[3]
			) {
				throw new EncryptorError('Unsupported payload magic header', encryptorErrorCodes.DECRYPTION_ERROR)
			}

			if (bytes[4] !== Encryptor._VERSION) {
				throw new EncryptorError('Unsupported payload version', encryptorErrorCodes.DECRYPTION_ERROR)
			}

			let offset = 5
			const formatFlag = bytes[offset]
			if (formatFlag !== Encryptor._FORMAT_FLAG) {
				throw new EncryptorError('Unsupported payload format flag', encryptorErrorCodes.DECRYPTION_ERROR)
			}
			offset += 1

			const saltLength = this._bytesToU32(bytes, offset)
			offset += 4
			if (saltLength < 8 || offset + saltLength > bytes.length) {
				throw new EncryptorError('Invalid payload salt section', encryptorErrorCodes.DECRYPTION_ERROR)
			}
			const salt = bytes.slice(offset, offset + saltLength)
			offset += saltLength

			const { aesKey, hmacKey } = await this._deriveKeys(salt)

			const plaintextLength = this._bytesToU32(bytes, offset)
			offset += 4
			if (offset + plaintextLength > bytes.length) {
				throw new EncryptorError('Invalid plaintext section', encryptorErrorCodes.DECRYPTION_ERROR)
			}
			const plaintextBytes = bytes.slice(offset, offset + plaintextLength)
			offset += plaintextLength

			const signatureLength = this._bytesToU32(bytes, offset)
			offset += 4
			if (offset + signatureLength > bytes.length) {
				throw new EncryptorError('Invalid signature section', encryptorErrorCodes.DECRYPTION_ERROR)
			}
			const signatureBytes = bytes.slice(offset, offset + signatureLength)
			offset += signatureLength

			const signatureValid = await runtimeCrypto.subtle.verify('HMAC', hmacKey, signatureBytes, plaintextBytes)
			this._throwIfCancelled()
			if (!signatureValid) {
				throw new EncryptorError('Plaintext verification failed', encryptorErrorCodes.PLAINTEXT_VERIFICATION_FAILED)
			}

			const plaintext = this._decoder.decode(plaintextBytes)
			if (this.bus.has('decrypt:plaintext')) {
				this.bus.emit('decrypt:plaintext', signatureBytes.buffer.slice(0), plaintext)
			}

			const ciphertextIvLength = this._bytesToU32(bytes, offset)
			offset += 4
			if (offset + ciphertextIvLength > bytes.length) {
				throw new EncryptorError('Invalid ciphertext iv section', encryptorErrorCodes.DECRYPTION_ERROR)
			}
			const ciphertextIv = bytes.slice(offset, offset + ciphertextIvLength)
			offset += ciphertextIvLength

			const ciphertextLength = this._bytesToU32(bytes, offset)
			offset += 4
			if (offset + ciphertextLength > bytes.length) {
				throw new EncryptorError('Invalid ciphertext section', encryptorErrorCodes.DECRYPTION_ERROR)
			}
			const ciphertextEncrypted = bytes.slice(offset, offset + ciphertextLength)
			offset += ciphertextLength

			const decryptedCiphertext = new Uint8Array(
				await runtimeCrypto.subtle.decrypt({ name: 'AES-GCM', iv: ciphertextIv }, aesKey, ciphertextEncrypted)
			)
			this._throwIfCancelled()
			if (this.bus.has('decrypt:ciphertext')) {
				this.bus.emit('decrypt:ciphertext', decryptedCiphertext.buffer.slice(0), this._toHex(ciphertextEncrypted))
			}

			const encryptedPartEnd = bytes.length

			const decryptedChunks: Uint8Array[] = []
			while (offset < encryptedPartEnd) {
				this._throwIfCancelled()
				const ivLength = this._bytesToU32(bytes, offset)
				offset += 4
				if (offset + ivLength > encryptedPartEnd) {
					throw new EncryptorError('Invalid chunk iv section', encryptorErrorCodes.DECRYPTION_ERROR)
				}
				const iv = bytes.slice(offset, offset + ivLength)
				offset += ivLength

				const encryptedChunkLength = this._bytesToU32(bytes, offset)
				offset += 4
				if (offset + encryptedChunkLength > encryptedPartEnd) {
					throw new EncryptorError('Invalid encrypted chunk section', encryptorErrorCodes.DECRYPTION_ERROR)
				}
				const encryptedChunk = bytes.slice(offset, offset + encryptedChunkLength)
				offset += encryptedChunkLength

				const decryptedChunk = new Uint8Array(
					await runtimeCrypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, encryptedChunk)
				)
				decryptedChunks.push(decryptedChunk)
				if (this.bus.has('decrypt:chunk')) {
					this.bus.emit('decrypt:chunk', decryptedChunk.buffer.slice(0), encryptedChunk.buffer.slice(0))
				}
			}

			const decrypted = this._concatBytes(decryptedChunks)
			this._throwIfCancelled()
			if (this.bus.has('decrypt:finish')) {
				this.bus.emit('decrypt:finish')
			}
			return decrypted.buffer.slice(decrypted.byteOffset, decrypted.byteOffset + decrypted.byteLength)
		} catch (error) {
			const normalized = this._normalizeError(error, false)
			if (this.bus.has('decrypt:error')) {
				this.bus.emit('decrypt:error', normalized)
			}
			throw normalized
		} finally {
			this._setRunning(false)
			this._cancelRequested = false
		}
	}

	/**
	 * 加密流数据
	 * - 输入输出均为 `ReadableStream<Uint8Array>`
	 * - 输出头部格式: MAGIC(4) + VERSION(1) + STREAM_FLAG(1) + saltLength(4) + salt + 明文信息 + 密文信息
	 * - 后续为重复分块: ivLength(4) + iv + encryptedChunkLength(4) + encryptedChunk
	 * @param stream 输入流
	 * @param options 加密附加选项
	 * @returns 加密后的输出流
	 */
	encryptStream(stream: BinaryReadable, options: EncryptionArrayBufferOptions = {}) {
		if (this.isRunning) {
			throw new EncryptorError('Encryptor is running', encryptorErrorCodes.ALREADY_RUNNING)
		}
		this._cancelRequested = false
		this._setRunning(true)

		const STREAM_FLAG = Encryptor._FORMAT_FLAG
		const reader = this._toReadableStream(stream).getReader()

		return new ReadableStream<Uint8Array>({
			start: async (controller) => {
				try {
					this._throwIfCancelled()
					const runtimeCrypto = globalThis.crypto
					const salt = runtimeCrypto.getRandomValues(new Uint8Array(Encryptor._KDF_SALT_LENGTH))
					const { aesKey, hmacKey } = await this._deriveKeys(salt)
					this._throwIfCancelled()

					const plaintext = options.plaintext ?? ''
					const ciphertextText = options.ciphertext ?? ''

					const plaintextBytes = this._encoder.encode(plaintext)
					const plaintextSignature = new Uint8Array(await runtimeCrypto.subtle.sign('HMAC', hmacKey, plaintextBytes))
					if (this.bus.has('encrypt:plaintext')) {
						this.bus.emit('encrypt:plaintext', plaintextSignature.buffer.slice(0), plaintext)
					}

					const ciphertextOriginBytes = this._encoder.encode(ciphertextText)
					const ciphertextIv = runtimeCrypto.getRandomValues(new Uint8Array(12))
					const ciphertextEncrypted = new Uint8Array(
						await runtimeCrypto.subtle.encrypt({ name: 'AES-GCM', iv: ciphertextIv }, aesKey, ciphertextOriginBytes)
					)
					if (this.bus.has('encrypt:ciphertext')) {
						this.bus.emit('encrypt:ciphertext', ciphertextEncrypted.buffer.slice(0), ciphertextText)
					}

					const header = this._concatBytes([
						new Uint8Array(Encryptor._MAGIC),
						new Uint8Array([Encryptor._VERSION]),
						new Uint8Array([STREAM_FLAG]),
						this._u32ToBytes(salt.length),
						salt,
						this._u32ToBytes(plaintextBytes.length),
						plaintextBytes,
						this._u32ToBytes(plaintextSignature.length),
						plaintextSignature,
						this._u32ToBytes(ciphertextIv.length),
						ciphertextIv,
						this._u32ToBytes(ciphertextEncrypted.length),
						ciphertextEncrypted
					])
					controller.enqueue(header)

					while (true) {
						this._throwIfCancelled()
						const { done, value } = await reader.read()
						if (done) {
							break
						}
						this._throwIfCancelled()
						const chunk = this._toArrayBufferBackedBytes(value instanceof Uint8Array ? value : new Uint8Array(value))
						const iv = runtimeCrypto.getRandomValues(new Uint8Array(12))
						const encryptedChunk = new Uint8Array(
							await runtimeCrypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, chunk)
						)
						controller.enqueue(this._u32ToBytes(iv.length))
						controller.enqueue(iv)
						controller.enqueue(this._u32ToBytes(encryptedChunk.length))
						controller.enqueue(encryptedChunk)
						if (this.bus.has('encrypt:chunk')) {
							this.bus.emit(
								'encrypt:chunk',
								this._toArrayBufferBackedBytes(encryptedChunk).buffer,
								this._toArrayBufferBackedBytes(chunk).buffer
							)
						}
					}

					if (this.bus.has('encrypt:finish')) {
						this.bus.emit('encrypt:finish')
					}
					controller.close()
				} catch (error) {
					const normalized = this._normalizeError(error, true)
					if (this.bus.has('encrypt:error')) {
						this.bus.emit('encrypt:error', normalized)
					}
					controller.error(normalized)
				} finally {
					this._setRunning(false)
					this._cancelRequested = false
					reader.releaseLock()
				}
			},
			cancel: async () => {
				this.cancel()
				await reader.cancel('stream canceled')
			}
		})
	}

	/**
	 * 解密流数据
	 * - 输入输出均为 `ReadableStream<Uint8Array>`
	 * @param stream 输入流
	 * @returns 解密后的输出流
	 */
	decryptStream(stream: BinaryReadable) {
		if (this.isRunning) {
			throw new EncryptorError('Encryptor is running', encryptorErrorCodes.ALREADY_RUNNING)
		}
		this._cancelRequested = false
		this._setRunning(true)

		const STREAM_FLAG = Encryptor._FORMAT_FLAG
		const reader = this._toReadableStream(stream).getReader()
		let pending = new Uint8Array(0)

		const appendPending = (next: Uint8Array) => {
			const normalizedNext = this._toArrayBufferBackedBytes(next)
			if (pending.length === 0) {
				pending = normalizedNext
				return
			}
			const merged = new Uint8Array(pending.length + normalizedNext.length)
			merged.set(pending)
			merged.set(normalizedNext, pending.length)
			pending = merged
		}

		const readExact = async (size: number) => {
			while (pending.length < size) {
				this._throwIfCancelled()
				const { done, value } = await reader.read()
				if (done) {
					throw new EncryptorError('Unexpected stream end', encryptorErrorCodes.DECRYPTION_ERROR)
				}
				appendPending(value instanceof Uint8Array ? value : new Uint8Array(value))
			}
			const part = pending.slice(0, size)
			pending = pending.slice(size)
			return part
		}

		const readU32 = async () => {
			const bytes = await readExact(4)
			return new DataView(bytes.buffer, bytes.byteOffset, 4).getUint32(0)
		}

		const readU32OrNullAtEof = async () => {
			while (pending.length < 4) {
				this._throwIfCancelled()
				const { done, value } = await reader.read()
				if (done) {
					if (pending.length === 0) {
						return null
					}
					throw new EncryptorError('Invalid stream tail', encryptorErrorCodes.DECRYPTION_ERROR)
				}
				appendPending(value instanceof Uint8Array ? value : new Uint8Array(value))
			}
			const bytes = pending.slice(0, 4)
			pending = pending.slice(4)
			return new DataView(bytes.buffer, bytes.byteOffset, 4).getUint32(0)
		}

		return new ReadableStream<Uint8Array>({
			start: async (controller) => {
				try {
					this._throwIfCancelled()
					const runtimeCrypto = globalThis.crypto
					this._throwIfCancelled()

					const magic = await readExact(4)
					if (
						magic[0] !== Encryptor._MAGIC[0] ||
						magic[1] !== Encryptor._MAGIC[1] ||
						magic[2] !== Encryptor._MAGIC[2] ||
						magic[3] !== Encryptor._MAGIC[3]
					) {
						throw new EncryptorError('Unsupported stream magic header', encryptorErrorCodes.DECRYPTION_ERROR)
					}

					const version = (await readExact(1))[0]
					if (version !== Encryptor._VERSION) {
						throw new EncryptorError('Unsupported stream version', encryptorErrorCodes.DECRYPTION_ERROR)
					}

					const streamFlagBytes = await readExact(1)
					const streamFlag = streamFlagBytes[0]
					if (streamFlag === undefined) {
						throw new EncryptorError('Invalid stream payload flag', encryptorErrorCodes.DECRYPTION_ERROR)
					}
					if (streamFlag !== STREAM_FLAG) {
						throw new EncryptorError('Unsupported stream payload flag', encryptorErrorCodes.DECRYPTION_ERROR)
					}

					const saltLength = await readU32()
					if (saltLength < 8) {
						throw new EncryptorError('Invalid stream salt length', encryptorErrorCodes.DECRYPTION_ERROR)
					}
					const salt = await readExact(saltLength)
					const { aesKey, hmacKey } = await this._deriveKeys(salt)

					const plaintextLength = await readU32()
					const plaintextBytes = await readExact(plaintextLength)

					const signatureLength = await readU32()
					const signatureBytes = await readExact(signatureLength)

					const signatureValid = await runtimeCrypto.subtle.verify('HMAC', hmacKey, signatureBytes, plaintextBytes)
					if (!signatureValid) {
						throw new EncryptorError('Plaintext verification failed', encryptorErrorCodes.PLAINTEXT_VERIFICATION_FAILED)
					}
					if (this.bus.has('decrypt:plaintext')) {
						this.bus.emit('decrypt:plaintext', signatureBytes.buffer.slice(0), this._decoder.decode(plaintextBytes))
					}

					const ciphertextIvLength = await readU32()
					const ciphertextIv = await readExact(ciphertextIvLength)

					const ciphertextLength = await readU32()
					const ciphertextEncrypted = await readExact(ciphertextLength)

					const decryptedCiphertext = new Uint8Array(
						await runtimeCrypto.subtle.decrypt({ name: 'AES-GCM', iv: ciphertextIv }, aesKey, ciphertextEncrypted)
					)
					if (this.bus.has('decrypt:ciphertext')) {
						this.bus.emit('decrypt:ciphertext', decryptedCiphertext.buffer.slice(0), this._toHex(ciphertextEncrypted))
					}

					while (true) {
						this._throwIfCancelled()
						const ivLength = await readU32OrNullAtEof()
						if (ivLength === null) {
							break
						}
						if (ivLength === 0) {
							throw new EncryptorError('Invalid stream chunk iv length', encryptorErrorCodes.DECRYPTION_ERROR)
						}
						const iv = await readExact(ivLength)
						const encryptedChunkLength = await readU32()
						const encryptedChunk = await readExact(encryptedChunkLength)

						const decryptedChunk = new Uint8Array(
							await runtimeCrypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, encryptedChunk)
						)
						if (this.bus.has('decrypt:chunk')) {
							this.bus.emit('decrypt:chunk', decryptedChunk.buffer.slice(0), encryptedChunk.buffer.slice(0))
						}
						controller.enqueue(decryptedChunk)
					}

					if (pending.length !== 0) {
						throw new EncryptorError('Invalid trailing stream bytes', encryptorErrorCodes.DECRYPTION_ERROR)
					}

					if (this.bus.has('decrypt:finish')) {
						this.bus.emit('decrypt:finish')
					}
					controller.close()
				} catch (error) {
					const normalized = this._normalizeError(error, false)
					if (this.bus.has('decrypt:error')) {
						this.bus.emit('decrypt:error', normalized)
					}
					controller.error(normalized)
				} finally {
					this._setRunning(false)
					this._cancelRequested = false
					reader.releaseLock()
				}
			},
			cancel: async () => {
				this.cancel()
				await reader.cancel('stream canceled')
			}
		})
	}

	/**
	 * 取消当前加解密流程
	 * - 会在下一次流程检查点中断并抛出 CANCELED 错误
	 * - 对 arrayBuffer、stream、file 相关 API 均生效
	 */
	cancel() {
		if (this.isRunning) {
			this._cancelRequested = true
		}
	}

	/**
	 * 加密文本
	 * @param text 待加密文本
	 * @param options 加密附加选项（明文/密文元数据）
	 * @returns 加密后的 base64 字符串
	 */
	async encryptText(text: string, options: EncryptionArrayBufferOptions = {}) {
		const buffer = await this.encryptArrayBuffer(this._encoder.encode(text).buffer, options)
		return btoa(String.fromCharCode(...new Uint8Array(buffer)))
	}

	/**
	 * 解密文本
	 * @param text 加密后的 base64 字符串
	 * @returns 解密后的文本字符串
	 */
	async decryptText(text: string) {
		const buffer = Uint8Array.from(atob(text), (c) => c.charCodeAt(0)).buffer
		const decrypted = await this.decryptArrayBuffer(buffer)
		return this._decoder.decode(decrypted)
	}
}

/** 文件加解密器 */
export class EncryptorFile extends Encryptor {
	private _createOutputFile(data: BlobPart[], name: string, type: string, lastModified: number) {
		return new File(data, name, { type, lastModified })
	}

	/**
	 * 文件加解密扩展
	 * - 在 Encryptor 基础上增加 File 与 Stream 的便捷接口
	 * - 文件名/扩展名/MIME/大小等元信息通过密文元数据承载
	 */

	/**
	 * 从文件名中提取扩展名（不带点）
	 * @param fileName 文件名
	 * @returns 扩展名
	 */
	private _getFileExtension(fileName: string) {
		const parts = fileName.split('.')
		if (parts.length <= 1) {
			return ''
		}
		return parts[parts.length - 1] || ''
	}

	/**
	 * 生成加密输出文件名，默认不泄露原始文件名
	 * @returns 输出文件名
	 */
	private _generateEncryptedOutputName() {
		return `encrypted-${Date.now()}.uef`
	}

	/**
	 * 解析密文元数据
	 * @param text 密文元数据明文串
	 * @returns 文件元信息
	 */
	private _parseCiphertextMeta(text: string) {
		try {
			const parsed = JSON.parse(text) as Partial<EncryptFileCiphertextMeta>
			if (parsed.type !== 'encryptor-file-meta' || parsed.version !== 1) {
				return null
			}
			if (!isString(parsed.name) || !isString(parsed.extension) || !isString(parsed.mimeType)) {
				return null
			}
			return {
				type: 'encryptor-file-meta' as const,
				version: 1 as const,
				name: parsed.name,
				extension: parsed.extension,
				mimeType: parsed.mimeType,
				size: typeof parsed.size === 'number' ? parsed.size : 0,
				lastModified: typeof parsed.lastModified === 'number' ? parsed.lastModified : Date.now(),
				extra: isObject(parsed.extra) ? (parsed.extra as Record<string, unknown>) : undefined
			}
		} catch {
			return null
		}
	}

	/**
	 * 生成文件密文元信息
	 * @param file 原始文件
	 * @param options 文件加密选项
	 * @returns 密文元信息对象
	 */
	private _buildFileCiphertextMeta(file: File, options: EncryptFileOptions) {
		return {
			type: 'encryptor-file-meta' as const,
			version: 1 as const,
			name: file.name,
			extension: this._getFileExtension(file.name),
			mimeType: file.type || 'application/octet-stream',
			size: file.size,
			lastModified: file.lastModified,
			extra: options.ciphertextMeta
		}
	}

	/**
	 * 将文件流式加密为输出流
	 * @param file 待加密文件
	 * @param options 文件加密选项
	 * @returns 加密后的可读流
	 */
	encryptFileToStream(file: File, options: EncryptFileStreamOptions = {}) {
		if (!(file instanceof File)) {
			throw new EncryptorError('file must be a File', encryptorErrorCodes.INVALID_FILE_INPUT)
		}

		const meta = this._buildFileCiphertextMeta(file, options)
		return this.encryptStream(file.stream(), {
			plaintext: options.plaintext,
			ciphertext: JSON.stringify(meta)
		})
	}

	/**
	 * 将密文文件流式解密为输出流
	 * @param file 待解密文件
	 * @returns 解密后的可读流
	 */
	decryptFileToStream(file: File) {
		if (!(file instanceof File)) {
			throw new EncryptorError('file must be a File', encryptorErrorCodes.INVALID_FILE_INPUT)
		}
		return this.decryptStream(file.stream())
	}

	/**
	 * 使用流式 API 加密文件并输出 File
	 * @param file 待加密文件
	 * @param options 文件加密选项
	 * @returns 加密后的文件对象
	 */
	async encryptFileStream(file: File, options: EncryptFileStreamOptions = {}) {
		if (!(file instanceof File)) {
			throw new EncryptorError('file must be a File', encryptorErrorCodes.INVALID_FILE_INPUT)
		}
		const encryptedStream = this.encryptFileToStream(file, options)
		const encryptedBlob = await new Response(encryptedStream).blob()
		const outputName = options.outputFileName || this._generateEncryptedOutputName()
		return this._createOutputFile([encryptedBlob], outputName, 'application/octet-stream', Date.now())
	}

	/**
	 * 使用流式 API 解密文件并输出 File
	 * @param file 待解密文件
	 * @param options 文件解密选项
	 * @returns 解密后的文件对象
	 */
	async decryptFileStream(file: File, options: DecryptFileStreamOptions = {}) {
		if (!(file instanceof File)) {
			throw new EncryptorError('file must be a File', encryptorErrorCodes.INVALID_FILE_INPUT)
		}

		let metaText = ''
		const decoder = new TextDecoder()
		const sign = this.bus.on('decrypt:ciphertext', (decryptedData) => {
			metaText = decoder.decode(new Uint8Array(decryptedData))
		})

		try {
			const decryptedStream = this.decryptFileToStream(file)
			const decryptedBlob = await new Response(decryptedStream).blob()
			const meta = this._parseCiphertextMeta(metaText)

			const fallbackName = options.fallbackFileName || `decrypted-${Date.now()}.bin`
			const outputName = options.outputFileName || meta?.name || fallbackName
			const outputType = meta?.mimeType || 'application/octet-stream'
			const outputLastModified = meta?.lastModified || Date.now()

			return this._createOutputFile([decryptedBlob], outputName, outputType, outputLastModified)
		} finally {
			this.bus.offBySign(sign)
		}
	}

	/**
	 * 加密文件
	 * - 文件名、扩展名、MIME 等敏感元信息将写入密文元数据
	 * - 生成的加密文件名默认不暴露原始文件名
	 * @param file 待加密文件
	 * @param options 文件加密选项
	 * @returns 加密后的文件对象
	 */
	async encryptFile(file: File, options: EncryptFileOptions = {}) {
		if (!(file instanceof File)) {
			throw new EncryptorError('file must be a File', encryptorErrorCodes.INVALID_FILE_INPUT)
		}

		const meta: EncryptFileCiphertextMeta = this._buildFileCiphertextMeta(file, options)

		const encrypted = await this.encryptArrayBuffer(await file.arrayBuffer(), {
			plaintext: options.plaintext,
			ciphertext: JSON.stringify(meta)
		})

		const outputName = options.outputFileName || this._generateEncryptedOutputName()
		return this._createOutputFile([encrypted], outputName, 'application/octet-stream', Date.now())
	}

	/**
	 * 解密文件
	 * - 优先从密文元数据恢复原始文件名、扩展名和 MIME
	 * @param file 待解密文件
	 * @param options 文件解密选项
	 * @returns 解密后的文件对象
	 */
	async decryptFile(file: File, options: DecryptFileOptions = {}) {
		if (!(file instanceof File)) {
			throw new EncryptorError('file must be a File', encryptorErrorCodes.INVALID_FILE_INPUT)
		}

		let metaText = ''
		const decoder = new TextDecoder()
		const sign = this.bus.on('decrypt:ciphertext', (decryptedData) => {
			metaText = decoder.decode(new Uint8Array(decryptedData))
		})

		try {
			const decrypted = await this.decryptArrayBuffer(await file.arrayBuffer())
			const meta = this._parseCiphertextMeta(metaText)

			const fallbackName = options.fallbackFileName || `decrypted-${Date.now()}.bin`
			const outputName = options.outputFileName || meta?.name || fallbackName
			const outputType = meta?.mimeType || 'application/octet-stream'
			const outputLastModified = meta?.lastModified || Date.now()

			return this._createOutputFile([decrypted], outputName, outputType, outputLastModified)
		} finally {
			this.bus.offBySign(sign)
		}
	}
}
