import type { ThemeStyleOptions, ThemeStyle } from './types'
import { themeStyleSchema } from './schema'
import { createVNode, Text, reactive, render, watchEffect } from 'vue'
export type * from './types'

export class Theme {
	uuid: string = crypto.randomUUID()
	style: ThemeStyle
	watchHandle?: () => void

	constructor(style: ThemeStyleOptions) {
		this.style = reactive(this.parse(style))
	}

	/** 校验并克隆主题样式, 避免外部对象与响应式状态互相影响 */
	private parse(style: ThemeStyleOptions) {
		const result = themeStyleSchema.safeParse(style)
		if (!result.success) {
			throw result.error
		}
		return result.data as ThemeStyle
	}

	/**
	 * 替换当前主题样式, 用于主题切换
	 * mount 中的 watchEffect 会依赖 style 的顶层字段, 整体重新赋值后自动刷新 CSS 变量
	 */
	setStyle(style: ThemeStyleOptions) {
		Object.assign(this.style, this.parse(style))
	}

	objToCSSVar(obj: Record<string, string | number | boolean>, prefix = '') {
		const vars: Record<string, string> = {}
		for (const [key, value] of Object.entries(obj)) {
			vars[`--${prefix}${key}`] = String(value)
		}
		return vars
	}

	deepObjToCSSVar(obj: Record<string, any>, prefix = '') {
		const vars: Record<string, string> = {}
		for (const [key, value] of Object.entries(obj)) {
			if (typeof value === 'object' && value !== null) {
				const nestedVars = this.deepObjToCSSVar(value, `${prefix}${key}-`)
				Object.assign(vars, nestedVars)
			} else {
				vars[`--${prefix}${key}`] = String(value)
			}
		}
		return vars
	}

	generateCSSVar(prefix = '') {
		return this.deepObjToCSSVar(this.style, prefix)
	}

	mount(prefix = '') {
		if (this.watchHandle) {
			this.watchHandle()
			this.watchHandle = void 0
		}
		const className = 'theme-styles'
		this.watchHandle = watchEffect(() => {
			const cssText = `:root {${Object.entries(this.generateCSSVar(prefix))
				.map(([key, value]) => `${key}: ${value};`)
				.join('')}}`

			let styleElement = document.querySelector(`style.${className}[data-uuid="${this.uuid}"]`) as HTMLStyleElement | null

			if (!styleElement) {
				styleElement = document.createElement('style')
				styleElement.className = className
				styleElement.setAttribute('data-uuid', this.uuid)
				document.head.appendChild(styleElement)
			}

			render(createVNode(Text, null, cssText), styleElement)
		})
	}

	unMount() {
		if (this.watchHandle) {
			this.watchHandle()
			this.watchHandle = void 0
			return true
		}
		return false
	}
}
