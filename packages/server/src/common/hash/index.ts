import bcrypt from 'bcrypt'
import { sys } from '@server/config'

/**
 * 哈希工具类，使用 bcrypt 进行哈希计算和校验
 * - 主要用于密码等敏感信息的安全存储
 */
export class Hash {
	private _salt: number

	/**
	 * 哈希工具类，使用 bcrypt 进行哈希计算和校验
	 * - 主要用于密码等敏感信息的安全存储
	 * @param salt 盐的轮数，值越大越安全，但计算时间也越长。一般建议在 10-12 之间。
	 */
	constructor(salt: number) {
		this._salt = salt
	}

	/** 将明文进行 `hash` */
	encode(str: string) {
		return bcrypt.hash(str, this._salt)
	}

	/** 校验明文 `hash` 后是否与给定的 `hash` 值匹配 */
	compare(plaintextStr: string, hashStr: string) {
		return bcrypt.compare(plaintextStr, hashStr)
	}
}

export const hash = new Hash(sys.config.common.hash.salt)
