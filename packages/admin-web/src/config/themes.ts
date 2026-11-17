/**
 * 主题预设
 * - 每个预设包含展示信息与实际主题样式, 主题切换时把 style 交给 Theme 实例渲染
 * - 新增主题只需在此追加预设, 无需改动切换逻辑
 */
import type { ThemeStyleOptions } from '@/frame/utils/theme'

/** 主题预设 */
export interface ThemePreset {
	/** 展示名称 */
	name: string
	/** 主题说明 */
	desc: string
	/** 主题样式 */
	style: ThemeStyleOptions
}

/** 各主题共用的字体系统 */
const typography: ThemeStyleOptions['typography'] = {
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
}

/** 各主题共用的边框宽度 */
const borderWidth: ThemeStyleOptions['border']['width'] = {
	base: '1px',
	sm: '1px',
	md: '2px',
	lg: '3px',
	xl: '4px'
}

/** 各主题共用的阴影 */
const shadow: ThemeStyleOptions['shadow'] = {
	base: '0 1px 3px rgba(0,0,0,0.08)',
	sm: '0 1px 4px rgba(0,0,0,0.10)',
	md: '0 2px 8px rgba(0,0,0,0.12)',
	lg: '0 4px 16px rgba(0,0,0,0.14)',
	xl: '0 8px 24px rgba(0,0,0,0.18)'
}

/** 各主题共用的间隔 */
const spacing: ThemeStyleOptions['layout']['spacing'] = {
	base: '8px',
	xs: '4px',
	sm: '8px',
	md: '12px',
	lg: '16px',
	xl: '24px'
}

/** 各主题共用的圆角 */
const radius: ThemeStyleOptions['radius'] = {
	sm: '4px',
	md: '8px',
	lg: '12px'
}

/** 默认主题: 保留原有蓝色主色 */
export const defaultTheme: ThemeStyleOptions = {
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
	typography,
	border: {
		width: borderWidth
	},
	shadow,
	layout: {
		spacing
	},
	radius,
	custom: {
		/** 浅色 */
		tintColor: '#e3eeff'
	}
}

/** 深蓝主题: 主色 #183055 */
export const navyTheme: ThemeStyleOptions = {
	id: 'navy',
	desc: '深蓝主题',
	color: {
		/** 基础主色 */
		primary: '#183055',
		/** 主色悬停/聚焦态（略亮） */
		primaryHover: '#22416F',
		secondary: '#41608F',
		/** 语义色 */
		success: '#67C23A',
		warning: '#E6A23C',
		danger: '#F56C6C',
		info: '#909399',
		/** 背景与表面 */
		background: '#f4f6fa',
		surface: '#FFFFFF',
		/** 文本与辅助文本 */
		text: '#2B3648',
		textSecondary: '#5C6B82',
		/** 线框与分割线 */
		border: '#D5DCE8',
		divider: '#E3E8F1',
		/** 遮罩与禁用 */
		overlay: 'rgba(11, 24, 45, 0.45)',
		placeholder: '#9AA6B8',
		disabled: '#C2CAD6'
	},
	typography,
	border: {
		width: borderWidth
	},
	shadow,
	layout: {
		spacing
	},
	radius,
	custom: {
		/** 浅色 */
		tintColor: '#e6efff',
		/** 登录页背景光晕: 使用明亮的品牌蓝, 避免深蓝主色铺底后发灰 */
		loginGlow: '#3884ff',
		/** 登录页使用主题主色作为深色背景 */
		loginBackground: '#183055',
		/** 文件树: 使用主题主色作为背景, 文件文字与图标使用白色系 */
		fileTreeBackground: '#183055',
		fileTreeText: '#FFFFFF',
		fileTreeSecondaryText: 'rgba(255, 255, 255, 0.65)',
		fileTreeHoverBackground: 'rgba(255, 255, 255, 0.12)',
		fileTreeActiveBackground: 'rgba(255, 255, 255, 0.2)'
	}
}

/** 可选主题列表, 顺序即设置页展示顺序 */
export const themePresets: ThemePreset[] = [
	{ name: '默认主题', desc: '现有蓝色主题', style: defaultTheme },
	{ name: '深蓝主题', desc: '沉稳深蓝, 主色 #183055', style: navyTheme }
]

/** 未指定或指定了不存在的主题时使用的预设 */
export const defaultThemePreset = themePresets[0]

/** 按主题 id 查找预设 */
export function getThemePresetById(id: string | null) {
	if (!id) return
	return themePresets.find((it) => it.style.id === id)
}
