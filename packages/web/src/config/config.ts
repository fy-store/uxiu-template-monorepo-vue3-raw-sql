/**
 * 全局配置文件
 * - 当前文件应当保持独立, 不应在此处引入任何组件或工具函数, 以避免循环依赖
 * - 仅包含全局可用的配置项和状态, 如项目基本信息、主题配置、布局配置等
 * - 通过 `reactive` 和 `ref` 创建响应式状态, 通过 `readonly` 导出只读版本供组件使用
 */
import type { Layout, Project, SidebarListItem } from './types'
import { reactive, markRaw, readonly, ref } from 'vue'
import { Theme } from '@/framework/utils'
import { Avatar, Folder } from '@element-plus/icons-vue'
import { CacheComponent } from '@/framework/utils'

export const _project = reactive<Project>({
	name: '后台管理系统',
	description: 'Vue 3 + Koa 3 管理系统模板',
	apiURL: import.meta.env.VITE_API_URL,
	sidebar: {
		list: []
	}
})
export const sidebarList = ref<SidebarListItem[]>([
	{
		path: '/books',
		title: '书库',
		icon: markRaw(Folder)
	},
	{
		path: '/admin',
		title: '管理员管理',
		icon: markRaw(Avatar)
	}
])

export const project = readonly(_project)

const _layout = reactive<Layout>({
	header: {
		height: '60px',
		backgroundColor: '#fff',
		color: '#222'
	},

	sidebar: {
		width: '230px'
	}
})
export const layout = _layout

const _theme = new Theme({
	id: 'default',
	desc: '默认主题',
	color: {
		/** 基础主色 */
		primary: '#0052D9',
		/** 主色悬停/聚焦态（略亮） */
		primaryHover: '#1E66FF',
		secondary: '#409eff',
		/** 语义色 */
		success: '#67C23A',
		warning: '#E6A23C',
		danger: '#F56C6C',
		info: '#909399',
		/** 背景与表面 */
		background: '#f6f7fb',
		surface: '#FFFFFF',
		/** 文本与辅助文本 */
		text: '#303133',
		textSecondary: '#606266',
		/** 线框与分割线 */
		border: '#dcdfe6',
		divider: '#E4E7ED',
		/** 遮罩与禁用 */
		overlay: 'rgba(0, 0, 0, 0.45)',
		placeholder: '#a8abb2',
		disabled: '#C0C4CC'
	},
	typography: {
		fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, PingFang SC, 'Microsoft YaHei', sans-serif",
		fontSize: {
			base: '14px',
			sm: '12px',
			md: '14px',
			lg: '16px',
			xl: '20px'
		},
		fontWeight: {
			regular: 400,
			medium: 500,
			bold: 700
		},
		lineHeight: {
			base: '1.5',
			heading: '1.25'
		}
	},
	border: {
		width: {
			base: '1px',
			sm: '1px',
			md: '2px',
			lg: '3px',
			xl: '4px'
		}
	},
	shadow: {
		base: '0 1px 3px rgba(0,0,0,0.08)',
		sm: '0 1px 4px rgba(0,0,0,0.10)',
		md: '0 2px 8px rgba(0,0,0,0.12)',
		lg: '0 4px 16px rgba(0,0,0,0.14)',
		xl: '0 8px 24px rgba(0,0,0,0.18)'
	},
	layout: {
		spacing: {
			base: '8px',
			xs: '4px',
			sm: '8px',
			md: '12px',
			lg: '16px',
			xl: '24px'
		}
	},
	radius: {
		sm: '4px',
		md: '8px',
		lg: '12px'
	},
	custom: {
		/** 浅色 */
		tintColor: '#e3eeff'
	}
})
_theme.mount('theme-')
export const theme = readonly(_theme)

export const cacheComponent = new CacheComponent()
