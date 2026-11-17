import { Router } from '@koa/router'
import { sys } from '@server/config'
import path from 'node:path/posix'
import { accountRouter } from './v1/account'
import { adminRouter } from './v1/admin'
import { debugRouter } from './v1/debug'
import { authorityRouter } from './v1/authority'
import { configRouter } from './v1/configuration'
import { apiClientRouter } from './v1/apiClient'
import { identitySession, verifyIdentityPermission } from './middleware'

export const router = new Router({
	prefix: path.join(sys.config.apiPath, 'v1')
})

// 仅作用于内部 API, 注入管理员会话并校验身份与权限
router.use(identitySession(), verifyIdentityPermission())
router.use(
	accountRouter.routes(),
	adminRouter.routes(),
	debugRouter.routes(),
	authorityRouter.routes(),
	configRouter.routes(),
	apiClientRouter.routes()
)
