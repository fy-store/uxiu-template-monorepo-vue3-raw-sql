import { Router } from '@koa/router'
import { getRouter } from './get'
import { postRouter } from './post'

export type * from './types'
export const apiClientRouter = new Router({
	prefix: '/apiClient'
})
apiClientRouter.use(getRouter.routes(), postRouter.routes())
