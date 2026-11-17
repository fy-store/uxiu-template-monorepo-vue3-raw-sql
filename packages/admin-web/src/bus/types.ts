import type { App } from 'vue'

export interface BusEvent {
	/**
	 * 应用挂载完成
	 * @param app 应用实例
	 */
	'app:mounted': (app: App<Element>) => void
}
