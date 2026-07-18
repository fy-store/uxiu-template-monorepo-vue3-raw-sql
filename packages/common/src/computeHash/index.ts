import type { ComputeHashOptions } from './types'
export * from './types'

/**
 * 获取文件哈希值
 * - 兼容 `node` 和 `浏览器`
 */
export class ComputeHash {
	/** hash 算法 */
	algorithm: string

	/**
	 * 创建哈希计算实例
	 * @param options 配置项
	 */
	constructor(options: ComputeHashOptions = {}) {
		const { algorithm = 'SHA-256' } = options
		this.algorithm = algorithm
	}

	/**
	 * 通过文本获取哈希值
	 * @param text 文本
	 */
	async getHashFromText(text: string) {
		const encoder = new TextEncoder()
		const uint8 = encoder.encode(text)
		return this.getHashFromArrayBuffer(uint8.buffer)
	}

	/**
	 * 通过文件路径获取文件的哈希值
	 * - `node` 使用文件路径
	 * - 浏览器使用 `blob`, `URL.createObjectURL(file)` 创建的 `URL` 或其他可通过 `fetch` 访问的 URL 或 base64 数据
	 * @param path 文件路径
	 */
	async getHashFromPath(path: string) {
		if (this.isNode() && !this.isWebUrl(path)) {
			const { readFile } = (await import('node:fs/promises')) as {
				readFile: (filePath: string) => Promise<Uint8Array>
			}
			const fileBuffer = await readFile(path)
			const normalized = new Uint8Array(fileBuffer.byteLength)
			normalized.set(fileBuffer)
			return this.getHashFromArrayBuffer(normalized.buffer)
		}

		const res = await fetch(path)
		if (!res.ok) {
			throw new Error(`读取资源失败: ${res.status} ${res.statusText}`)
		}

		const buffer = await res.arrayBuffer()
		return this.getHashFromArrayBuffer(buffer)
	}

	/**
	 * 通过 ArrayBuffer 获取哈希值
	 * @param buffer ArrayBuffer
	 */
	async getHashFromArrayBuffer(buffer: ArrayBuffer) {
		const digest = await globalThis.crypto.subtle.digest(this.algorithm, buffer)
		return this.arrayBufferToHex(digest)
	}

	/**
	 * 通过 Blob 获取哈希值
	 * - `node` 和 `浏览器` 都支持 `Blob`
	 * - `Blob` 是 `File` 的父类, 此方法也适用于 `File`
	 * @param blob Blob
	 */
	async getHashFromBlob(blob: Blob) {
		const buffer = await blob.arrayBuffer()
		return this.getHashFromArrayBuffer(buffer)
	}

	/**
	 * 将摘要二进制数据转为十六进制字符串
	 * @param buffer 摘要结果
	 */
	private arrayBufferToHex(buffer: ArrayBuffer) {
		const bytes = new Uint8Array(buffer)
		let hash = ''

		for (const byte of bytes) {
			hash += byte.toString(16).padStart(2, '0')
		}

		return hash
	}

	/**
	 * 判断当前是否为 Node 运行环境
	 */
	private isNode() {
		const processLike = (globalThis as typeof globalThis & { process?: { versions?: { node?: string } } }).process
		return typeof processLike?.versions?.node === 'string'
	}

	/**
	 * 判断路径是否为可通过 `fetch` 访问的 URL
	 * @param path 资源路径
	 */
	private isWebUrl(path: string) {
		return /^(https?:|blob:|data:|file:)/i.test(path)
	}
}
