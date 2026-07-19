import type { App } from 'vue'

export interface BusEvent {
	'app:mounted': (app: App<Element>) => void
}
