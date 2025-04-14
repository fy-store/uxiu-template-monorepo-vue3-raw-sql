export interface Project {
	/** 项目监听端口 */
	port: number
	/** api 路径 */
	apiPath: string

	/** 登录验证 */
	loginVerify: {
		/** 到期间隔时长 */
		expireInterval: number
		/** 用户最大会话数, 如果超过则移除最长时间未操作的会话 */
		maxSession: 5
	}

	/** 公共方法配置 */
	common: {
		/** 哈希配置 */
		hash: {
			salt: number
		}
		/** 加密配置 */
		encipher: {
			/** 16字节 */
			iv: string
			/** 32字节 */
			key: string
		}
		/** 日志配置 */
		logger: {
			/** 日志存储位置 */
			storagePath: string
		}
		aliOSS: {
			/** 临时凭证配置 */
			sts: {
				/** 用户 key */
				accessKeyId: string
				/** 用户 密钥 */
				accessKeySecret: string
				/** 角色 */
				roleArn: string
				/**
				 * - 自定义权限策略，用于进一步限制 STS 临时访问凭证的权限。
				 * - 如果不指定 Policy，则返回的 STS 临时访问凭证默认拥有指定角色的所有权限
				 * - 使用字符串或对象配置, 不配置请置为空字符串
				 */
				policy: string
				/** 临时访问凭证有效时间单位为秒(取值最小15分钟, 最大1小时) */
				expirationSeconds: number
			}
			/** 客户端操作配置 */
			client: {
				/** Bucket所在地域, 示例："oss-cn-guangzhou" */
				region: string
				/** 存储空间名称 */
				bucket: string
			}
		}
	}
}

export interface Mysql {
	connect: {
		host: string
		port: number
		database: string
		user: string
		password: string
	}
	tables: {
		admin: {
			name: string
			fields: {
				nameLength: number
				accountLength: number
				passwordLength: number
			}
		}
		userSession: {
			name: string
			fields: {
				sessionIdLength: number
			}
		}
	}
}
