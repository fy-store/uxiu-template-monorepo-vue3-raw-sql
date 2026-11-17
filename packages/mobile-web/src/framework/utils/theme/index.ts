import type { ThemeStyleOptions, ThemeStyle } from './types'
import { themeStyleSchema } from './schema'
import { createVNode, Text, reactive, render, watchEffect } from 'vue'
export type * from './types'

export class Theme {
	uuid: string = crypto.randomUUID()
	style: ThemeStyle
	watchHandle?: () => void

	constructor(style: ThemeStyleOptions) {
		const result = themeStyleSchema.safeParse(style)
		if (!result.success) {
			throw result.error
		}
		this.style = reactive(result.data as ThemeStyle)
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
