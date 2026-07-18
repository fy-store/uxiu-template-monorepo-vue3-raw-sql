import { Router } from '@koa/router'
import { createAdminRouter } from './createAdmin'
import { getAdminListRouter } from './getAdminList'
import { deleteAdminRouter } from './deleteAdmin'
import { updateAdminRouter } from './updateAdmin'

export type * from './types'
export const adminRouter = new Router()
adminRouter.use(
	createAdminRouter.routes(),
	createAdminRouter.allowedMethods(),
	getAdminListRouter.routes(),
	getAdminListRouter.allowedMethods(),
	deleteAdminRouter.routes(),
	deleteAdminRouter.allowedMethods(),
	updateAdminRouter.routes(),
	updateAdminRouter.allowedMethods()
)
