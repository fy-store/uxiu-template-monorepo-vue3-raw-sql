import { Router } from '@koa/router'
import { getRouter } from './get'

export const debugRouter = new Router()
debugRouter.use(getRouter.routes())
