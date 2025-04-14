import path from 'path/posix'
import log4js from 'log4js'

const rootPath = process.cwd()
const storePath = path.join(rootPath, $.sysConf.project.common.logger.storagePath)

const config: log4js.Configuration = {
	pm2: true,
	appenders: {
		/** 中断日志: 系统中断 */
		stopError: {
			type: 'dateFile',
			filename: path.join(storePath, 'stopError/stopError.log'),
			pattern: 'yyyy-MM-dd',
			keepFileExt: true,
			maxLogSize: 1024 * 1024,
			fileNameSep: '_',
			numBackups: 500,
			layout: {
				type: 'pattern',
				pattern:
					'级别: %p%n' +
					'主机: %h%n' +
					'记录时间: %d{yyyy-MM-dd hh:mm:ss}%n' +
					'文件路径: %f%n' +
					'调用定位: %f:%l:%o%n' +
					'调用堆栈: %n%s%n' +
					'记录数据: %m%n'
			}
		},

		/** 数据库操作日志: 数据库的读写 */
		db: {
			type: 'dateFile',
			filename: path.join(storePath, 'db/db.log'),
			pattern: 'yyyy-MM-dd',
			keepFileExt: true,
			maxLogSize: 1024 * 1024,
			fileNameSep: '_',
			numBackups: 500,
			layout: {
				type: 'pattern',
				pattern:
					'级别: %p%n' +
					'主机: %h%n' +
					'记录时间: %d{yyyy-MM-dd hh:mm:ss}%n' +
					'文件路径: %f%n' +
					'调用定位: %f:%l:%o%n' +
					'调用堆栈: %n%s%n' +
					'记录数据: %m%n'
			}
		},

		/** 请求日志 */
		req: {
			type: 'dateFile',
			filename: path.join(storePath, 'req/req.log'),
			pattern: 'yyyy-MM-dd',
			keepFileExt: true,
			maxLogSize: 1024 * 1024,
			fileNameSep: '_',
			numBackups: 500,
			layout: {
				type: 'pattern',
				pattern:
					'级别: %p%n' +
					'主机: %h%n' +
					'记录时间: %d{yyyy-MM-dd hh:mm:ss}%n' +
					'文件路径: %f%n' +
					'调用定位: %f:%l:%o%n' +
					'调用堆栈: %n%s%n' +
					'记录数据: %m%n'
			}
		},

		/** 请求错误日志 */
		reqError: {
			type: 'dateFile',
			filename: path.join(storePath, 'reqError/reqError.log'),
			pattern: 'yyyy-MM-dd',
			keepFileExt: true,
			maxLogSize: 1024 * 1024,
			fileNameSep: '_',
			numBackups: 500,
			layout: {
				type: 'pattern',
				pattern:
					'级别: %p%n' +
					'主机: %h%n' +
					'记录时间: %d{yyyy-MM-dd hh:mm:ss}%n' +
					'文件路径: %f%n' +
					'调用定位: %f:%l:%o%n' +
					'调用堆栈: %n%s%n' +
					'记录数据: %m%n'
			}
		},

		/** 访问日志 */
		visit: {
			type: 'dateFile',
			filename: path.join(storePath, 'visit/visit.log'),
			pattern: 'yyyy-MM-dd',
			keepFileExt: true,
			maxLogSize: 1024 * 1024,
			fileNameSep: '_',
			numBackups: 500,
			layout: {
				type: 'pattern',
				pattern:
					'级别: %p%n' +
					'主机: %h%n' +
					'记录时间: %d{yyyy-MM-dd hh:mm:ss}%n' +
					'文件路径: %f%n' +
					'调用定位: %f:%l:%o%n' +
					'调用堆栈: %n%s%n' +
					'记录数据: %m%n'
			}
		},

		/** 调试日志 */
		debug: {
			type: 'dateFile',
			filename: path.join(storePath, 'debug/debug.log'),
			pattern: 'yyyy-MM-dd',
			keepFileExt: true,
			maxLogSize: 1024 * 1024,
			fileNameSep: '_',
			numBackups: 500,
			layout: {
				type: 'pattern',
				pattern:
					'级别: %p%n' +
					'主机: %h%n' +
					'记录时间: %d{yyyy-MM-dd hh:mm:ss}%n' +
					'文件路径: %f%n' +
					'调用定位: %f:%l:%o%n' +
					'调用堆栈: %n%s%n' +
					'记录数据: %m%n'
			}
		},

		/** 默认日志: 只输出信息, 不做记录 */
		send: {
			type: 'console'
		}
	},
	categories: {
		/** 中断日志: 系统中断 */
		stopError: {
			enableCallStack: true,
			level: 'all',
			appenders: ['stopError']
		},

		/** 数据库操作日志: 数据库的读写 */
		db: {
			enableCallStack: true,
			level: 'all',
			appenders: ['db']
		},

		/** 请求日志 */
		req: {
			enableCallStack: true,
			level: 'all',
			appenders: ['req']
		},

		/** 请求错误日志 */
		reqError: {
			enableCallStack: true,
			level: 'all',
			appenders: ['reqError']
		},

		/** 访问日志 */
		visit: {
			enableCallStack: true,
			level: 'all',
			appenders: ['visit']
		},

		/** 调试日志 */
		debug: {
			enableCallStack: true,
			level: 'all',
			appenders: ['debug']
		},

		/** 默认日志: 只输出信息, 不做记录 */
		default: {
			enableCallStack: true,
			level: 'all',
			appenders: ['send']
		}
	}
}

log4js.configure(config)

/** 中断日志: 系统中断 */
const stopError = log4js.getLogger('stopError')

/** 数据库操作日志: 数据库的读写 */
const db = log4js.getLogger('db')

/** 请求日志 */
const req = log4js.getLogger('req')

/** 请求错误日志 */
const reqError = log4js.getLogger('reqError')

/** 访问日志 */
const visit = log4js.getLogger('visit')

/** 调试日志 */
const debug = log4js.getLogger('debug')

/** 默认日志: 只输出信息, 不做记录 */
const send = log4js.getLogger('default')

// 未正常退出时将未记录完的日志继续记录
process.on('exit', () => {
	log4js.shutdown()
})

// 中断异常记录
process.on('uncaughtException', (err, origin) => {
	send.error('进程中断错误', err, '\n')
	stopError.error(
		`\n    异常来源: ${origin} => ${origin === 'uncaughtException' ? '同步错误' : '异步错误'}\n` +
			`    错误类型: ${err?.name}\n` +
			`    错误信息: ${err?.message}\n` +
			`    错误堆栈: ${err?.stack}`
	)

	log4js.shutdown(() => {
		process.exit(1)
	})
})

globalThis.$logger = {
	stopError,
	db,
	req,
	reqError,
	visit,
	debug,
	send
}

export const logger = {
	stopError,
	db,
	req,
	reqError,
	visit,
	debug,
	send
}
