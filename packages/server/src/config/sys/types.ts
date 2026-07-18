import type Router from '@koa/router'
import type { ReadonlyDeep } from 'uxiu'
import sysConfig from '../../../sys.config'

export interface Sys {
	/** 根路径 */
	rootPath: string
	/** 当前环境 */
	env: 'development' | 'production'
	/** 当前程序服务 ipv4 */
	ipv4: string
	/** 系统配置信息 */
	config: ReadonlyDeep<typeof sysConfig>
	/** 路由器v1 */
	routerV1: Router
	/** 开放接口v1 */
	openApiV1: Router
}
