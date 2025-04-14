import { logger } from '../index.js'

export interface AliOSSCreateOptions {
	/**
	 * 自定义权限策略，用于进一步限制STS临时访问凭证的权限, 此参数将覆盖配置文件参数
	 */
	policy?: string | Record<string, any>
	/**
	 * 用于自定义角色会话名称，用来区分不同的令牌(只能英文), 默认为 ''
	 */
	sessionName?: string
}

export interface Logger {
	stopError: typeof logger.stopError
	db: typeof logger.db
	req: typeof logger.req
	reqError: typeof logger.reqError
	visit: typeof logger.visit
	debug: typeof logger.debug
	send: typeof logger.send
}
