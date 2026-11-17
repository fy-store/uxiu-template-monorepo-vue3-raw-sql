import type { SymmetryEncipherOptions, SymmetryKey } from './types'
export type * from './types'

/**
 * 对称加解密 (AES-256-CBC)
 * - 兼容浏览器和 Node.js 环境 (使用 Web Crypto API)
 * - 输入输出的向量、密钥和密文均为 hex 字符串
 */
export class SymmetryEncipher {
	private _iv: string
	private _key: string

	private _cryptoKey: CryptoKey | null = null

	/**
	 * 创建对称加解密实例
	 * @param options 配置项
	 */
	constructor(options: SymmetryEncipherOptions) {
		const { iv, key } = options
		this._iv = iv
		this._key = key
	}

	/**
	 * hex 字符串转 ArrayBuffer
	 */
	static hexToArrayBuffer(hex: string): ArrayBuffer {
		return Uint8Array.fromHex(hex).buffer
	}

	/**
	 * ArrayBuffer 转 hex 字符串
	 */
	static arrayBufferToHex(buffer: ArrayBuffer): string {
		return new Uint8Array(buffer).toHex()
	}

	/**
	 * 生成随机 IV 和密钥（AES-256-CBC）
	 * - IV: 16 字节随机数
	 * - Key: 32 字节随机数
	 */
	static generateKey(): SymmetryKey {
		const iv = globalThis.crypto.getRandomValues(new Uint8Array(16))
		const key = globalThis.crypto.getRandomValues(new Uint8Array(32))
		return {
			iv: SymmetryEncipher.arrayBufferToHex(iv.buffer),
			key: SymmetryEncipher.arrayBufferToHex(key.buffer)
		}
	}

	/**
	 * 导入 AES-CBC 密钥
	 */
	private async _getKey(): Promise<CryptoKey> {
		if (this._cryptoKey) return this._cryptoKey

		const rawKey = SymmetryEncipher.hexToArrayBuffer(this._key)
		this._cryptoKey = await globalThis.crypto.subtle.importKey(
			'raw',
			rawKey,
			{ name: 'AES-CBC' },
			true,
			['encrypt', 'decrypt']
		)
		return this._cryptoKey
	}

	/**
	 * 加密
	 * @param plaintext 明文
	 */
	async encryption(plaintext: string): Promise<string> {
		const key = await this._getKey()
		const iv = SymmetryEncipher.hexToArrayBuffer(this._iv)
		const encoded = new TextEncoder().encode(plaintext)
		const encrypted = await globalThis.crypto.subtle.encrypt(
			{ name: 'AES-CBC', iv },
			key,
			encoded
		)
		return SymmetryEncipher.arrayBufferToHex(encrypted)
	}

	/**
	 * 加密 JSON 数据
	 * @param jsonData JSON 数据
	 */
	async encryptionJSON<T extends object>(jsonData: T): Promise<string> {
		return this.encryption(JSON.stringify(jsonData))
	}

	/**
	 * 解密
	 * @param encrypted 加密后的 hex 字符串
	 */
	async decrypted(encrypted: string): Promise<string> {
		const key = await this._getKey()
		const iv = SymmetryEncipher.hexToArrayBuffer(this._iv)
		const encryptedBuffer = SymmetryEncipher.hexToArrayBuffer(encrypted)
		const decrypted = await globalThis.crypto.subtle.decrypt(
			{ name: 'AES-CBC', iv },
			key,
			encryptedBuffer
		)
		return new TextDecoder().decode(decrypted)
	}

	/**
	 * 解密 JSON 数据
	 * @param encrypted 加密后的 hex 字符串
	 */
	async decryptedJSON<T extends object>(encrypted: string): Promise<T> {
		return JSON.parse(await this.decrypted(encrypted)) as T
	}
}