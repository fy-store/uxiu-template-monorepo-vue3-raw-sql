/**
 * 挂载全局
 */
import './modules/mountSysConf.js'
import Router from 'koa-router'
import { logger } from '@/common/index.js'

const router = new Router()
globalThis.$.router = router
globalThis.$.logger = logger
