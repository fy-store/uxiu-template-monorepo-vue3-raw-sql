import nodemailer from 'nodemailer'

/** 邮件发送服务器配置 */
export interface MailServerConfig {
	/** SMTP 服务器地址 */
	host: string
	/** SMTP 端口 */
	port: number
	/** 是否使用 SSL/TLS */
	secure: boolean
	/** SMTP 登录账号 */
	user: string
	/** SMTP 登录密码/授权码 */
	pass: string
	/** 发件人地址, 形如 `名称 <邮箱>` */
	from: string
}

/** 待发送邮件内容 */
export interface SendMailOptions {
	/** 收件人 */
	to: string
	/** 邮件主题 */
	subject: string
	/** 纯文本内容 */
	text?: string
	/** HTML 内容 */
	html?: string
}

/**
 * 通过给定的 SMTP 配置发送邮件
 * - 每次调用创建一次性 transporter, 避免长期持有连接与密码
 * @param config SMTP 服务器配置
 * @param options 邮件内容
 */
export async function sendMail(config: MailServerConfig, options: SendMailOptions) {
	const transporter = nodemailer.createTransport({
		host: config.host,
		port: config.port,
		secure: config.secure,
		auth: config.user ? { user: config.user, pass: config.pass } : void 0
	})
	try {
		return await transporter.sendMail({
			from: config.from || config.user,
			to: options.to,
			subject: options.subject,
			text: options.text,
			html: options.html
		})
	} finally {
		transporter.close()
	}
}
