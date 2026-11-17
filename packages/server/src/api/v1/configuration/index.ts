import { Router } from '@koa/router'
import { getRouter } from './get'

export type * from './types'
export const configRouter = new Router({ prefix: '/config' })
configRouter.use(getRouter.routes())
