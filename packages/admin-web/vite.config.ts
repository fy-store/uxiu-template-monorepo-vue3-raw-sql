import path from 'path/posix'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import AutoImport from 'unplugin-auto-import/vite'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import UnoCSS from 'unocss/vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'

const srcPath = fileURLToPath(new URL('./src', import.meta.url))
const serverPath = fileURLToPath(new URL('../server', import.meta.url))
const commonPath = fileURLToPath(new URL('../common/src', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		vue(),
		vueJsx(),
		vueDevTools(),
		AutoImport({
			resolvers: [
				ElementPlusResolver(),
				// 自动导入图标组件
				IconsResolver({
					prefix: 'Icon'
				})
			],
			dts: path.join(process.cwd(), 'auto-imports.d.ts')
		}),
		Components({
			resolvers: [
				ElementPlusResolver(),
				// 自动注册图标组件
				IconsResolver({
					enabledCollections: ['ep'] // 使用 i-ep-xxx (icon-elementPlus-iconName)
				}),
				// 自动导入 Element Plus 组件
				ElementPlusResolver()
			],
			dts: path.join(process.cwd(), 'components.d.ts')
		}),
		Icons({
			autoInstall: true
		}),
		UnoCSS()
	],
	optimizeDeps: {
		// @yishu/inkline 内部通过 `monaco-editor/...?worker` 动态加载 Monaco worker,
		// 预构建无法解析带 `?worker` 的路径, 因此该包不参与预构建
		exclude: ['@yishu/inkline'],
		// 该包被排除预构建后, 它直接导入的 tiptap 依赖若也没被预构建, 就会以源码形式单独加载,
		// 与项目自身预构建出的 prosemirror 形成两份实例, 触发
		// "Adding different instances of a keyed plugin" 报错, 因此显式列为一组预构建
		include: [
			'markdown-it-task-lists',
			'@tiptap/core',
			'@tiptap/pm/commands',
			'@tiptap/pm/model',
			'@tiptap/pm/state',
			'@tiptap/pm/view',
			'@tiptap/extension-code-block',
			'@tiptap/extension-table',
			'@tiptap/extension-task-list',
			'@tiptap/starter-kit'
		]
	},
	resolve: {
		alias: {
			'@': srcPath,
			'@common': commonPath,
			'@server': serverPath
		}
	}
})
