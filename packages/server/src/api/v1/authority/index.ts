import { Router } from '@koa/router'
import { getAuthoritySelectRouter } from './getAuthoritySelect'

export type * from './types'
export const authorityRouter = new Router()
authorityRouter.use(getAuthoritySelectRouter.routes())
