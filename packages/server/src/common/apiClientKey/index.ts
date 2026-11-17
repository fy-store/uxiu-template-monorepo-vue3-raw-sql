import { ComputeHash } from '@common/computeHash'
import { asymmetricEncipher } from '@server/common/asymmetricEncipher'

/** 授权密钥携带的载荷, 用于标识客户端与签发信息 */
export interface ApiClientKeyPayload {
	/** 版本号 */
	v: number
	/** 密钥标识, 落库为 key_id */
	kid: string
	/** 随机数, 保证同一 kid 每次签发的密钥都不同 */
	nonce: string
	/** 签发时间戳(毫秒) */
	iat: number
}

/** 授权密钥当前版本 */
const KEY_VERSION = 1

/** 分隔载荷与签名的字符, base64 不包含该字符 */
const KEY_SEPARATOR = '.'

/** 解析并校验后的密钥信息 */
export interface ParsedApiClientKey {
	/** 密钥标识 */
	kid: string
	/** 载荷 */
	payload: ApiClientKeyPayload
}

/**
 * 计算授权密钥的哈希值, 用于落库校验
 * @param key 完整授权密钥
 */
export async function computeApiClientKeyHash(key: string) {
	return new ComputeHash().getHashFromText(key)
}

/**
 * 颁发一个授权密钥
 * - 载荷以 base64 编码后由 RSA 私钥签名, 密钥格式为 `<payloadB64>.<signatureB64>`
 * @param kid 密钥标识, 不传时自动生成
 */
export async function createApiClientKey(kid: string = crypto.randomUUID()) {
	const payload: ApiClientKeyPayload = {
		v: KEY_VERSION,
		kid,
		nonce: crypto.randomUUID(),
		iat: Date.now()
	}
	// @ts-ignore es2026 已支持
	const payloadB64 = new TextEncoder().encode(JSON.stringify(payload)).toBase64()
	const signature = await asymmetricEncipher.sign(payloadB64)
	const key = `${payloadB64}${KEY_SEPARATOR}${signature}`
	return {
		key,
		keyId: kid,
		keyHash: await computeApiClientKeyHash(key)
	}
}

/**
 * 校验并解析授权密钥
 * - 仅校验密钥自身结构与签名, 不查询数据库
 * @param key 完整授权密钥
 * @returns 校验通过返回载荷信息, 否则返回 `null`
 */
export async function parseAndVerifyApiClientKey(key: string): Promise<ParsedApiClientKey | null> {
	if (typeof key !== 'string') return null
	const segments = key.split(KEY_SEPARATOR)
	if (segments.length !== 2) return null
	const [payloadB64, signature] = segments
	if (!payloadB64 || !signature) return null

	let verified = false
	try {
		verified = await asymmetricEncipher.verify(payloadB64, signature)
	} catch {
		return null
	}
	if (!verified) return null

	try {
		// @ts-ignore es2026 已支持
		const payload = JSON.parse(new TextDecoder().decode(Uint8Array.fromBase64(payloadB64))) as ApiClientKeyPayload
		if (payload?.v !== KEY_VERSION) return null
		if (typeof payload.kid !== 'string' || !payload.kid) return null
		if (typeof payload.nonce !== 'string' || !payload.nonce) return null
		if (typeof payload.iat !== 'number') return null
		return { kid: payload.kid, payload }
	} catch {
		return null
	}
}
