import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import UnoCSS from 'unocss/vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import components from 'unplugin-vue-components/vite'
import autoImport from 'unplugin-auto-import/vite'
import { VarletImportResolver } from '@varlet/import-resolver'

const srcPath = fileURLToPath(new URL('./src', import.meta.url))
const serverPath = fileURLToPath(new URL('../server', import.meta.url))
const commonPath = fileURLToPath(new URL('../common/src', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		UnoCSS(),
		vue(),
		vueJsx(),
		// vueDevTools(),
		components({
			resolvers: [VarletImportResolver()]
		}),
		autoImport({
			resolvers: [VarletImportResolver({ autoImport: true })]
		})
	],
	// 开启控制台消息转发
	// server: {
	// 	forwardConsole: {
	// 		logLevels: ['log', 'info', 'error', 'warn', 'debug'],
	// 		unhandledErrors: true
	// 	}
	// },
	resolve: {
		alias: {
			'@': srcPath,
			'@common': commonPath,
			'@server': serverPath
		}
	}
})
