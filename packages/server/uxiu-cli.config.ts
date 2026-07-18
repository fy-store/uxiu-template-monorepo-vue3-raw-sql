import { defineBuild } from 'uxiu-cli'
import fs from 'fs'
import path from 'path'
import commonPack from '../../package.json' with { type: 'json' }

const sysPath = path.join(process.cwd(), 'sys.config.ts')
export default defineBuild({
	entry: {
		index: './src/index.ts',
		'scripts/key': './scripts/key.ts',
		'scripts/keyPair': './scripts/keyPair.ts',
		'scripts/initRoot': './scripts/initRoot.ts',
		'scripts/initDb': './scripts/initDb.ts'
	},
	tsdownOptions: {
		define: {
			'process.env.NODE_ENV': `'production'`,
			'sys.env': `'production'`
		},
		external: [
			/node_modules/,
			// @ts-ignore
			...Object.keys(commonPack.dependencies ?? {}).map((k) => new RegExp(`^${k}(\\/|$)`)),
			// @ts-ignore
			...Object.keys(commonPack.devDependencies ?? {}).map((k) => new RegExp(`^${k}(\\/|$)`)),
			// @ts-ignore
			...Object.keys(commonPack.peerDependencies ?? {}).map((k) => new RegExp(`^${k}(\\/|$)`))
		],

		plugins: [
			{
				name: 'virtual-empty-sys-config',
				load(id) {
					if (id === sysPath) {
						return 'export default {}'
					}
				}
			}
		]
	},
	event: {
		async 'hook:afterBuild'(ctx) {
			const { dependencies } = commonPack
			const pack = JSON.parse(fs.readFileSync(path.join(ctx.pwd, './dist/package.json')).toString())
			Object.assign(pack.dependencies, dependencies)
			pack.scripts['key'] = 'node ./scripts/key.js'
			pack.scripts['key:pair'] = 'node ./scripts/keyPair.js'
			pack.scripts['init:root'] = 'node ./scripts/initRoot.js'
			pack.scripts['init:db'] = 'node ./scripts/initDb.js'
			fs.writeFileSync(path.join(ctx.pwd, './dist/package.json'), JSON.stringify(pack, null, 2))
			const { default: sysConfig } = await import(sysPath)
			const json5 = JSON.stringify(sysConfig, null, 2)
			fs.writeFileSync(path.join(ctx.pwd, './dist/sys.config.json5'), json5)
		}
	}
})
