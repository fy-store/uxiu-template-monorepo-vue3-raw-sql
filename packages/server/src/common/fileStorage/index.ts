import { FileStorage } from '@server/utils'
import { sys } from '@server/config'
import path from 'node:path'

export const fileStorage = new FileStorage({
	storagePath: path.join(sys.rootPath, sys.config.common.fileStorage.storagePath)
})
