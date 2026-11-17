export interface KeyPair {
	/** PEM 格式公钥 */
	publicKey: string
	/** PEM 格式私钥 */
	privateKey: string
}

export interface GenerateKeyPairOptions {
	/** 模长，默认 2048 */
	modulusLength?: 2048 | 4096
	/** OAEP 哈希算法，默认 'SHA-256' */
	oaepHash?: string
}

export interface AsymmetricEncipherOptions {
    /** 公钥 */
	publicKey: string
	/** 私钥 */
	privateKey: string
	/** 填充方式, 默认 OAEP */
	padding?: number
	/** OAEP 哈希算法 */
	oaepHash?: string
}
