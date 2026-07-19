import { Router } from '@koa/router'
import { sys } from '@server/config'
import path from 'node:path/posix'
import { accountRouter } from './v1/account'
import { adminRouter } from './v1/admin'
import { fileRouter } from './v1/file'
import { debugRouter } from './v1/debug'
import { authorityRouter } from './v1/authority'

export type * from './v1/account'
export type * from './v1/admin'
export type * from './v1/file'
export type * from './v1/debug'
export type * from './v1/authority'

export const router = new Router({
	prefix: path.join(sys.config.apiPath, 'v1')
})

router.use(
	accountRouter.routes(),
	adminRouter.routes(),
	fileRouter.routes(),
	debugRouter.routes(),
	authorityRouter.routes()
)
