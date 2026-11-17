export interface SymmetryKey {
	/** 向量 (hex, 32 位 / 16 字节) */
	iv: string
	/** 密钥 (hex, 64 位 / 32 字节) */
	key: string
}

export interface SymmetryEncipherOptions {
	/** 向量 (hex 字符串, AES-CBC 需要 16 字节) */
	iv: string
	/** 密钥 (hex 字符串, AES-256 需要 32 字节) */
	key: string
}