import { Router } from '@koa/router'
import { getAuthoritySelectRouter } from './getAuthoritySelect'

export type * from './types'
export const adminRouter = new Router()
adminRouter.use(getAuthoritySelectRouter.routes())
