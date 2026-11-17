import type { Logger as LoggerType } from 'uxiu'

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			NODE_ENV: 'development' | 'production'
			[key: string]: string | undefined
		}
	}
}

export {}
