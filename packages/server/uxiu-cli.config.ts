import { defineBuild } from 'uxiu-cli'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import commonPack from '../../package.json' with { type: 'json' }

const sysPath = path.join(process.cwd(), 'sys.config.ts')
export default defineBuild({
	entry: {
		'src/index': './src/',
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
		async 'hook:beforeBuild'(ctx) {
			await fs.promises.rm(path.join(ctx.pwd, './dist'), { recursive: true, force: true })
		},
		async 'hook:afterBuild'(ctx) {
			const { dependencies } = commonPack
			const { default: packageJson } = await import('./dist/package.json', { with: { type: 'json' } })
			packageJson.main = './src/index.js'
			packageJson.scripts.start = 'node ./src/index.js'
			await fs.promises.writeFile('./dist/package.json', JSON.stringify(packageJson, null, 2))
			Object.assign(packageJson.dependencies, dependencies)
			packageJson.scripts['key'] = 'node ./scripts/key.js'
			packageJson.scripts['key:pair'] = 'node ./scripts/keyPair.js'
			packageJson.scripts['init:root'] = 'node ./scripts/initRoot.js'
			packageJson.scripts['init:db'] = 'node ./scripts/initDb.js'
			await fs.promises.writeFile('./dist/package.json', JSON.stringify(packageJson, null, 2))
			const { default: sysConfig } = await import(pathToFileURL(sysPath).href)
			const json5 = JSON.stringify(sysConfig, null, 2)
			fs.writeFileSync(path.join(ctx.pwd, './dist/sys.config.json5'), json5)
		}
	}
})
