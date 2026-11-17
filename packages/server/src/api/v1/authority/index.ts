import { Router } from '@koa/router'
import { getRouter } from './get'

export type * from './types'
export const authorityRouter = new Router()
authorityRouter.use(getRouter.routes())
