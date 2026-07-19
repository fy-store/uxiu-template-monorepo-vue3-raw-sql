import config from '../../../sys.config'
import type { Sys } from './types'
import Router from '@koa/router'
import { getLocalIP } from 'uxiu'
import { readonly } from 'uxiu'
import json5 from 'json5'
import fs from 'node:fs'
import path from 'node:path'
export type * from './types'

const _sys: Sys = {
	rootPath: process.cwd(),
	env: process.env.NODE_ENV === 'development' ? 'development' : 'production',
	ipv4: getLocalIP.getPrimaryLocalIP(),
	config:
		process.env.NODE_ENV === 'development'
			? readonly(config)
			: readonly(json5.parse(fs.readFileSync(path.join(process.cwd(), 'sys.config.json5')).toString()))
}

export const sys: Sys = readonly.shallowReadonly(_sys)
