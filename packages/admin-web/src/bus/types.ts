import type { CommonConfig } from '@server/api/v1/config'
import type { App, DeepReadonly } from 'vue'

export interface BusEvent {
	/**
	 * 应用挂载完成
	 * @param app 应用实例
	 */
	'app:mounted': (app: App<Element>) => void
	/**
	 * 登录成功
	 * @param commonConfig 只读公共配置
	 */
	'logined:success': (commonConfig: DeepReadonly<CommonConfig>) => void
}
