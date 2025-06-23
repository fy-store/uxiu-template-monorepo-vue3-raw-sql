/**
 * 挂载全局
 */
import './modules/mountSysConf.js'
import Router from 'koa-router'
import { logger } from '@/common/index.js'

const router = new Router()
globalThis.sys.router = router
globalThis.sys.logger = logger
