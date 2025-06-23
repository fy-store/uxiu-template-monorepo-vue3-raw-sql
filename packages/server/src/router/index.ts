export type * from './types/index.js'
import Router from 'koa-router'
import './modules/account/index.js'
import './modules/admin/index.js'
import './modules/authority/index.js'

const router = new Router()
export default router.use(sys.conf.project.apiPath, sys.router.routes())
