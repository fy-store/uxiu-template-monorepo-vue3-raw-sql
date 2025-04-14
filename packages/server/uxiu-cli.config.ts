import { defindBuild } from 'uxiu-cli'
import fs from 'fs'
import path from 'path'

export default defindBuild({
	input: {
		index: './src/index.ts',
		'scripts/key': './scripts/key.ts',
		'scripts/initRoot': './scripts/initRoot.ts'
	},
	copy: ['./sysConf/modules/project.yaml', './sysConf/modules/mysql.yaml'],
	afterBuild() {
		const root = process.cwd()
		const { dependencies, pnpm } = JSON.parse(fs.readFileSync(path.join(root, '../../package.json')).toString())
		const pack = JSON.parse(fs.readFileSync(path.join(root, './dist/package.json')).toString())
		Object.assign(pack.dependencies, dependencies)
		pack.pnpm = pnpm
		pack.scripts.key = 'node ./scripts/key.js'
		pack.scripts['init:root'] = 'node ./scripts/initRoot.js'
		fs.writeFileSync(path.join(root, './dist/package.json'), JSON.stringify(pack, null, 2))
	}
})
