import { Router } from '@koa/router'
import { getTokenRouter } from './getToken'

export const debugRouter = new Router()
debugRouter.use(getTokenRouter.routes())
