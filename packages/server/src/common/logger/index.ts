import path from 'path/posix'
import { sys } from '@server/config'
import { createLogger } from 'uxiu'

export const logger = await createLogger({
	storageDirPath: path.join(process.cwd(), sys.config.common.logger.storagePath),
	categories: {
		/** 数据库日志 */
		db: true
	}
})
