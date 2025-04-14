import fs from 'fs-extra'
import path from 'path/posix'
import color from 'picocolors'
import { name, description, version } from '../package.json'

try {
	const root = process.cwd()
	console.log('')
	console.log(color.green(`正在整合文件...`), '\n')
	const target = path.join(root, '/dist')
	if (fs.pathExistsSync(target)) {
		fs.rmSync(target, { recursive: true })
	}
	fs.moveSync(path.join(root, '/packages/server/dist'), target)
	fs.moveSync(path.join(root, '/packages/web/dist'), path.join(root, '/dist/public'))
	const pack = JSON.parse(fs.readFileSync(path.join(root, '/dist/package.json'), 'utf-8').toString())
	pack.name = name
	pack.description = description
	pack.version = version
	fs.writeFileSync(path.join(root, '/dist/package.json'), JSON.stringify(pack, null, 2))
	console.log(color.green(`整合完成: ${path.join(root, 'dist').replaceAll('\\', '/')}`), '\n')
	process.exit(0)
} catch (error) {
	console.error(error)
	process.exit(1)
}
