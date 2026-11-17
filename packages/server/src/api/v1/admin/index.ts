import { Router } from '@koa/router'
import { getRouter } from './get'
import { postRouter } from './post'

export type * from './types'
export const adminRouter = new Router()
adminRouter.use(getRouter.routes(), postRouter.routes())
