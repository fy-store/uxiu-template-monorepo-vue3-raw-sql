import { Router } from '@koa/router'
import { sys } from '@server/config'
import { openApiSession, verifyOpenApiKey } from '../middleware'

/** 对外开放 API 路由, 使用 API 客户端授权密钥鉴权 */
export const openApiRouter = new Router({
	prefix: sys.config.openApiPath
})
openApiRouter.use(openApiSession())
openApiRouter.use(verifyOpenApiKey())
