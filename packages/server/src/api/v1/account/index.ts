import { Router } from '@koa/router'
import { loginRouter } from './login'
import { getMyInfoRouter } from './getMyInfo'

export type * from './types'
export const accountRouter = new Router()
accountRouter.use(loginRouter.routes(), getMyInfoRouter.routes())
