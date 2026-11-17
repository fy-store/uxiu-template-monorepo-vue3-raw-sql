import fs from 'node:fs'
import path from 'node:path'

await Promise.all([
	fs.promises.rm(path.resolve('./node_modules'), { force: true, recursive: true }),
	fs.promises.rm(path.resolve('./packages/admin-web/node_modules'), { force: true, recursive: true }),
	fs.promises.rm(path.resolve('./packages/server/node_modules'), { force: true, recursive: true }),
	fs.promises.rm(path.resolve('./packages/common/node_modules'), { force: true, recursive: true })
])
