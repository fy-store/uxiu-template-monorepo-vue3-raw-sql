import fs from 'node:fs/promises'
import path from 'node:path'
import { sys } from '@server/config'
import { Router } from '@koa/router'
import { uploadFileRouter } from './uploadFile'

export type * from './types'
export const fileRouter = new Router()
fileRouter.use(uploadFileRouter.routes())
// 初始化文件存储临时目录
const fileConfig = sys.config.common.fileStorage
await fs.mkdir(path.join(sys.rootPath, fileConfig.tempPath), { recursive: true })
