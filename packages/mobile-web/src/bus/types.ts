import type { CommonConfig } from '@server/api/v1/config'
import type { App, DeepReadonly } from 'vue'

export interface BusEvent {
	'app:init': () => void
	'app:mounted': (app: App<Element>) => void
	'logined:success': (commonConfig: DeepReadonly<CommonConfig>) => void
}
