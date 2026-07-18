import { z } from 'zod'

/** 默认系统配置参数 */
export const defaultSysConfigSchema = z.object({
	/** 服务域名 */
	domain: z.string(),
	/** 服务挂载端口 */
	port: z.number(),
	/** 路由路径 */
	apiPath: z.string(),
	/** openApi 路径 */
	openApiPath: z.string(),
	/** 登录验证 */
	loginVerify: z.object({
		/** 到期间隔时长(毫秒) */
		expireInterval: z.number().min(1),
		/** 用户最大会话数, 如果超过则移除最长时间未操作的会话 */
		maxSession: z.number().int().min(1)
	}),
	/** cookie 密钥 */
	cookieKeys: z.array(z.string()).min(1),
	/** 公共模块 */
	common: z.object({
		/** 哈希 */
		hash: z.object({
			/** 盐 */
			salt: z.number().int().min(1)
		}),
		/** 对称加密 */
		symmetryEncipher: z.object({
			/** 初始向量 16字节 */
			iv: z.string(),
			/** 密钥 32字节 */
			key: z.string()
		}),
		/** 非对称加密 */
		asymmetricEncipher: z.object({
			/** 公钥 PEM 格式 */
			publicKey: z.string(),
			/** 私钥 PEM 格式 */
			privateKey: z.string()
		}),
		/** 日志 */
		logger: z.object({
			/** 存储路径 */
			storagePath: z.string()
		})
	}),
	/** mysql 数据库 */
	mysql: z.object({
		/** 连接 */
		connect: z.object({
			/** 主机地址 */
			host: z.string(),
			/** 端口号 */
			port: z.number(),
			/** 数据库名称 */
			database: z.string(),
			/** 用户名 */
			user: z.string(),
			/** 密码 */
			password: z.string()
		})
	})
})
