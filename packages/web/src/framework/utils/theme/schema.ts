import { z } from 'zod'

export const themeStyleSchema = z.object({
	/** 主题ID, 需保证唯一, 为主题切换提供唯一标识 */
	id: z.string(),
	/** 主题描述 */
	desc: z.string().default('').optional(),
	/** 颜色系统 */
	color: z.object({
		/** 主色 */
		primary: z.string(),
		/** 主色悬停 */
		primaryHover: z.string(),
		/** 次要色 */
		secondary: z.string(),
		/** 成功色 */
		success: z.string(),
		/** 警告色 */
		warning: z.string(),
		/** 危险色 */
		danger: z.string(),
		/** 信息色 */
		info: z.string(),
		/** 背景色 */
		background: z.string(),
		/** 表面色 */
		surface: z.string(),
		/** 文本色 */
		text: z.string(),
		/** 次文本色 */
		textSecondary: z.string(),
		/** 边框色 */
		border: z.string(),
		/** 分割线色 */
		divider: z.string(),
		/** 遮罩色 */
		overlay: z.string(),
		/** 占位色 */
		placeholder: z.string(),
		/** 禁用色 */
		disabled: z.string()
	}),
	/** 字体系统 */
	typography: z.object({
		/** 字体 */
		fontFamily: z.string(),
		/** 字体大小 */
		fontSize: z.object({
			/** 基准 */
			base: z.string(),
			/** 小(small) */
			sm: z.string(),
			/** 中等(medium) */
			md: z.string(),
			/** 大(large) */
			lg: z.string(),
			/** 超大(extra large) */
			xl: z.string()
		}),
		/** 字体粗细 */
		fontWeight: z.object({
			/** 细 */
			regular: z.number(),
			/** 中等 */
			medium: z.number(),
			/** 粗 */
			bold: z.number()
		}),
		/** 行高 */
		lineHeight: z.object({
			/** 基准 */
			base: z.string(),
			/** 标题 */
			heading: z.string()
		})
	}),
	/** 边框样式 */
	border: z.object({
		/** 边框宽度 */
		width: z.object({
			/** 基准 */
			base: z.string(),
			/** 小(small) */
			sm: z.string(),
			/** 中等(medium) */
			md: z.string(),
			/** 大(large) */
			lg: z.string(),
			/** 超大(extra large) */
			xl: z.string()
		})
	}),
	/** 阴影系统 */
	shadow: z.object({
		/** 基准 */
		base: z.string(),
		/** 小(small) */
		sm: z.string(),
		/** 中等(medium) */
		md: z.string(),
		/** 大(large) */
		lg: z.string(),
		/** 超大(extra large) */
		xl: z.string()
	}),
	/** 布局尺寸配置 */
	layout: z.object({
		/** 间隔 */
		spacing: z.object({
			/** 基准 */
			base: z.string(),
			/** 超小(Extra small) */
			xs: z.string(),
			/** 小(small) */
			sm: z.string(),
			/** 中等(medium) */
			md: z.string(),
			/** 大(large) */
			lg: z.string(),
			/** 超大(extra large) */
			xl: z.string()
		})
	}),
	/** 圆角系统 */
	radius: z.object({
		/** 小(small) */
		sm: z.string(),
		/** 中等(medium) */
		md: z.string(),
		/** 大(large) */
		lg: z.string()
	}),
	/** 自定义扩展 */
	custom: z.record(z.string(), z.any()).default({}).optional()
})
