import fs from 'fs-extra'
import { FileManage } from '../packages/server/src/utils/FileManage'
import path from 'node:path'
import { styleText } from 'node:util'
import { name, description, version } from '../package.json'

const fm = new FileManage()
try {
	const root = process.cwd()
	console.log('')
	console.log(styleText('green', `正在整合文件...`))
	console.log('')
	const target = path.join(root, '/dist')
	if (fm.isDirExistSync(target)) {
		const children = fm.getDirChildrenSync(target)
		const fileterPathInfo = children.filter((it) => {
			if (it.isDirectory && it.name === 'node_modules') {
				return false
			}
			if (it.isFile && (it.name === 'package-lock.json' || it.name === 'pnpm-lock.yaml' || it.name === 'yarn.lock')) {
				return false
			}
			return true
		})
		await Promise.all(
			fileterPathInfo.map((it) => {
				return fm.remove(path.join(it.parentPath, it.name))
			})
		)
	}
	fm.createDirSync(root, '/dist')
	await fm.moveChildren(path.join(root, '/packages/server/dist'), target, { replace: true })
	await fm.moveChildren(path.join(root, '/packages/web/dist'), path.join(root, '/dist/public'), { replace: true })
	const pack = JSON.parse(await fm.readToText(path.join(root, '/dist/package.json')))
	pack.name = name
	pack.description = description
	pack.version = version
	await fm.writeFileFromText(path.join(root, '/dist/package.json'), JSON.stringify(pack, null, 2))
	console.log(styleText('green', `整合完成: ${path.join(root, 'dist').replaceAll('\\', '/')}`))
	console.log('')
	process.exit(0)
} catch (error) {
	console.error(error)
	process.exit(1)
}
