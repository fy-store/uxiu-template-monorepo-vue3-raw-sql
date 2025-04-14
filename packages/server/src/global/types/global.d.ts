import type { Logger } from './src/common/modules/logger/index.ts'
import type { Project, Mysql } from '@root/sysConf/types/index.ts'
import type Router from 'koa-router'
declare global {
	var $: {
		/** 日志对象 */
		logger: Logger
		/** 系统配置信息 */
		sysConf: {
			project: Project
			mysql: Mysql
		}
		/** 路由器 */
		router: Router
	}
}
export {}
