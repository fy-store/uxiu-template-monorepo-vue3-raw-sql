import type { AsymmetricEncipherOptions, GenerateKeyPairOptions, KeyPair } from './types'
export type * from './types'

/**
 * 非对称加解密 (RSA)
 * - 默认使用 RSA-OAEP + SHA-256 加解密
 * - 默认使用 RSASSA-PKCS1-v1_5 + SHA-256 签名验签
 * - 兼容浏览器和 Node.js 环境 (使用 Web Crypto API)
 */
export class AsymmetricEncipher {
	private _publicKey: string
	private _privateKey: string
	private _oaepHash: string
	private _signHash: string

	private _encryptKey: CryptoKey | null = null
	private _decryptKey: CryptoKey | null = null
	private _signKey: CryptoKey | null = null
	private _verifyKey: CryptoKey | null = null

	/**
	 * 创建非对称加解密实例
	 * @param options 配置项
	 */
	constructor(options: AsymmetricEncipherOptions) {
		const { publicKey, privateKey, oaepHash = 'sha256' } = options
		this._publicKey = publicKey
		this._privateKey = privateKey
		this._oaepHash = AsymmetricEncipher.normalizeHash(oaepHash)
		this._signHash = this._oaepHash
	}

	/**
	 * PEM 格式公钥/私钥字符串转 ArrayBuffer
	 */
	static pemToArrayBuffer(pem: string): ArrayBuffer {
		const b64 = pem
			.replace(/-----BEGIN [A-Z ]+-----/, '')
			.replace(/-----END [A-Z ]+-----/, '')
			.replace(/\s/g, '')
		return Uint8Array.fromBase64(b64).buffer
	}

	/**
	 * ArrayBuffer 转 Base64 字符串
	 */
	static arrayBufferToBase64(buffer: ArrayBuffer): string {
		return new Uint8Array(buffer).toBase64()
	}

	/**
	 * Base64 字符串转 ArrayBuffer
	 */
	static base64ToArrayBuffer(base64: string): ArrayBuffer {
		return Uint8Array.fromBase64(base64).buffer
	}

	/**
	 * 标准化哈希算法名称
	 * - Node: sha256, sha384, sha512
	 * - Web Crypto: SHA-256, SHA-384, SHA-512
	 */
	static normalizeHash(hash: string): string {
		const h = hash.toUpperCase().replace(/-/g, '')
		if (h === 'SHA256') return 'SHA-256'
		if (h === 'SHA384') return 'SHA-384'
		if (h === 'SHA512') return 'SHA-512'
		if (h === 'SHA1') return 'SHA-1'
		return hash
	}

	/**
	 * ArrayBuffer 转 PEM 格式字符串
	 */
	private static _arrayBufferToPem(buffer: ArrayBuffer, label: string): string {
		const base64 = AsymmetricEncipher.arrayBufferToBase64(buffer)
		const lines: string[] = []
		for (let i = 0; i < base64.length; i += 64) {
			lines.push(base64.substring(i, i + 64))
		}
		return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----`
	}

	/**
	 * 生成 RSA 密钥对
	 * @param options 生成选项
	 */
	static async generateKeyPair(options?: GenerateKeyPairOptions): Promise<KeyPair> {
		const modulusLength = options?.modulusLength ?? 2048
		const hash = AsymmetricEncipher.normalizeHash(options?.oaepHash ?? 'sha256')

		const keyPair = await globalThis.crypto.subtle.generateKey(
			{
				name: 'RSA-OAEP',
				modulusLength,
				publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
				hash: { name: hash }
			},
			true,
			['encrypt', 'decrypt']
		)

		const [spki, pkcs8] = await Promise.all([
			globalThis.crypto.subtle.exportKey('spki', keyPair.publicKey),
			globalThis.crypto.subtle.exportKey('pkcs8', keyPair.privateKey)
		])

		return {
			publicKey: AsymmetricEncipher._arrayBufferToPem(spki, 'PUBLIC KEY'),
			privateKey: AsymmetricEncipher._arrayBufferToPem(pkcs8, 'PRIVATE KEY')
		}
	}

	/**
	 * 导入 RSA-OAEP 公钥 (加密用)
	 */
	private async _getEncryptKey(): Promise<CryptoKey> {
		if (this._encryptKey) return this._encryptKey

		this._encryptKey = await globalThis.crypto.subtle.importKey(
			'spki',
			AsymmetricEncipher.pemToArrayBuffer(this._publicKey),
			{ name: 'RSA-OAEP', hash: { name: this._oaepHash } },
			true,
			['encrypt']
		)
		return this._encryptKey
	}

	/**
	 * 导入 RSA-OAEP 私钥 (解密用)
	 */
	private async _getDecryptKey(): Promise<CryptoKey> {
		if (this._decryptKey) return this._decryptKey

		this._decryptKey = await globalThis.crypto.subtle.importKey(
			'pkcs8',
			AsymmetricEncipher.pemToArrayBuffer(this._privateKey),
			{ name: 'RSA-OAEP', hash: { name: this._oaepHash } },
			true,
			['decrypt']
		)
		return this._decryptKey
	}

	/**
	 * 导入 RSASSA-PKCS1-v1_5 私钥 (签名用)
	 */
	private async _getSignKey(): Promise<CryptoKey> {
		if (this._signKey) return this._signKey

		this._signKey = await globalThis.crypto.subtle.importKey(
			'pkcs8',
			AsymmetricEncipher.pemToArrayBuffer(this._privateKey),
			{ name: 'RSASSA-PKCS1-v1_5', hash: { name: this._signHash } },
			true,
			['sign']
		)
		return this._signKey
	}

	/**
	 * 导入 RSASSA-PKCS1-v1_5 公钥 (验签用)
	 */
	private async _getVerifyKey(): Promise<CryptoKey> {
		if (this._verifyKey) return this._verifyKey

		this._verifyKey = await globalThis.crypto.subtle.importKey(
			'spki',
			AsymmetricEncipher.pemToArrayBuffer(this._publicKey),
			{ name: 'RSASSA-PKCS1-v1_5', hash: { name: this._signHash } },
			true,
			['verify']
		)
		return this._verifyKey
	}

	/**
	 * 使用公钥加密
	 * @param plaintext 明文
	 */
	async encryption(plaintext: string): Promise<string> {
		const key = await this._getEncryptKey()
		const encoded = new TextEncoder().encode(plaintext)
		const encrypted = await globalThis.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, encoded)
		return AsymmetricEncipher.arrayBufferToBase64(encrypted)
	}

	/**
	 * 使用公钥加密 JSON 数据
	 * @param jsonData JSON 数据
	 */
	async encryptionJSON<T extends object>(jsonData: T): Promise<string> {
		return this.encryption(JSON.stringify(jsonData))
	}

	/**
	 * 使用私钥解密
	 * @param encryptedBase64 加密后的 base64 字符串
	 */
	async decrypted(encryptedBase64: string): Promise<string> {
		const key = await this._getDecryptKey()
		const encrypted = AsymmetricEncipher.base64ToArrayBuffer(encryptedBase64)
		const decrypted = await globalThis.crypto.subtle.decrypt({ name: 'RSA-OAEP' }, key, encrypted)
		return new TextDecoder().decode(decrypted)
	}

	/**
	 * 使用私钥解密 JSON 数据
	 * @param encryptedBase64 加密后的 base64 字符串
	 */
	async decryptedJSON<T extends object>(encryptedBase64: string): Promise<T> {
		return JSON.parse(await this.decrypted(encryptedBase64)) as T
	}

	/**
	 * 私钥签名 (RSASSA-PKCS1-v1_5)
	 * @param plaintext 明文
	 * @param _hashAlg 哈希算法 (Web Crypto 环境下由密钥导入时决定, 此参数仅保留兼容)
	 */
	async sign(plaintext: string, _hashAlg?: string): Promise<string> {
		const key = await this._getSignKey()
		const encoded = new TextEncoder().encode(plaintext)
		const signature = await globalThis.crypto.subtle.sign({ name: 'RSASSA-PKCS1-v1_5' }, key, encoded)
		return AsymmetricEncipher.arrayBufferToBase64(signature)
	}

	/**
	 * 公钥验签
	 * @param plaintext 明文
	 * @param signatureBase64 签名后的 base64 字符串
	 * @param _hashAlg 哈希算法 (Web Crypto 环境下由密钥导入时决定, 此参数仅保留兼容)
	 */
	async verify(plaintext: string, signatureBase64: string, _hashAlg?: string): Promise<boolean> {
		const key = await this._getVerifyKey()
		const encoded = new TextEncoder().encode(plaintext)
		const signature = AsymmetricEncipher.base64ToArrayBuffer(signatureBase64)
		return globalThis.crypto.subtle.verify({ name: 'RSASSA-PKCS1-v1_5' }, key, signature, encoded)
	}
}
