import { Router } from '@koa/router'
import { getRouter } from './get'
import { postRouter } from './post'

export type * from './types'
export const personalizationRouter = new Router()
personalizationRouter.use(getRouter.routes(), postRouter.routes())
