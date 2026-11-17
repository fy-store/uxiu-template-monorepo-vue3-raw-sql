/**
 * 全局配置文件
 * - 当前文件应当保持独立, 不应在此处引入任何组件或工具函数, 以避免循环依赖
 * - 仅包含全局可用的配置项和状态, 如项目基本信息、主题配置、布局配置等
 * - 通过 `reactive` 和 `ref` 创建响应式状态, 通过 `readonly` 导出只读版本供组件使用
 */
import type { Layout, Project, SidebarListItem } from './types'
import { reactive, markRaw, readonly, ref } from 'vue'
import { Theme } from '@/frame/utils'
import { Setting } from '@element-plus/icons-vue'
import { CacheComponent } from '@/frame/utils'
import { defaultThemePreset, getThemePresetById } from './themes'
import { persistenceKeys } from './persistence'

export const _project = reactive<Project>({
	name: '工单系统',
	logo: '',
	description: '工单系统',
	apiURL: import.meta.env.VITE_API_URL,
	sidebar: {
		list: []
	},
	loginPath: '/login',
	whileRoutes: ['/', '/login']
})
export const sidebarList = ref<SidebarListItem[]>([
	{
		path: '/admin',
		title: '管理员管理',
		icon: markRaw(Setting)
	}
])

export const project = readonly(_project)

const _layout = reactive<Layout>({
	header: {
		height: '30px',
		backgroundColor: '#fff',
		color: '#222'
	},

	sidebar: {
		width: '230px'
	}
})
export const layout = _layout

/** 启动时按浏览器持久化的主题 id 恢复主题, 未设置或无效时使用默认主题 */
const initialThemePreset = getThemePresetById(localStorage.getItem(persistenceKeys.THEME)) ?? defaultThemePreset
export const _theme = new Theme(initialThemePreset.style)
_theme.mount('theme-')
export const theme = readonly(_theme)

/** 组件缓存 */
export const cacheComponent = new CacheComponent()
