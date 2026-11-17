import type { App } from 'vue'

export interface BusEvent {
	'app:init': () => void
	'app:mounted': (app: App<Element>) => void
}
