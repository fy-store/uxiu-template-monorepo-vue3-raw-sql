export type * from './types/index.js'
import Router from 'koa-router'
import './modules/account/index.js'
import './modules/admin/index.js'
import './modules/authority/index.js'

const router = new Router()
export default router.use($.sysConf.project.apiPath, $.router.routes())
