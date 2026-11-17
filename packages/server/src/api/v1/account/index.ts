import { Router } from '@koa/router'
import { getRouter } from './get'
import { postRouter } from './post'

export type * from './types'
export const accountRouter = new Router()
accountRouter.use(getRouter.routes(), postRouter.routes())
