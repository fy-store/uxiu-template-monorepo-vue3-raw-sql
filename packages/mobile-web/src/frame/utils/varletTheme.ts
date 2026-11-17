import type { Theme } from './theme'
import { watchEffect } from 'vue'

/**
 * 主题色字段到 Varlet 设计变量的映射。
 * - 键为主题中的颜色字段名, 值为不包含 `color-`/`hsl-` 前缀的 Varlet 变量名
 */
const varletColorMap = {
	primary: ['primary', 'primary-container'],
	success: ['success', 'success-container'],
	warning: ['warning', 'warning-container'],
	danger: ['danger', 'danger-container'],
	info: ['info', 'info-container'],
	background: ['body'],
	surface: ['surface-container', 'surface-container-low', 'surface-container-high', 'surface-container-highest'],
	text: ['text'],
	textSecondary: ['on-surface-variant'],
	border: ['outline'],
	placeholder: ['text-disabled'],
	disabled: ['disabled']
} as const

/**
 * 将十六进制颜色解析为 rgb 分量。
 * @param hex 形如 `#0052D9` 或 `#05D` 的颜色值。
 * @returns rgb 分量数组, 无法解析时返回 undefined。
 */
function parseHexColor(hex: string) {
	const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
	if (!match) return
	let value = match[1]
	if (value.length === 3) {
		value = value
			.split('')
			.map((char) => char + char)
			.join('')
	}
	const int = Number.parseInt(value, 16)
	return [(int >> 16) & 255, (int >> 8) & 255, int & 255] as const
}

/**
 * 将十六进制颜色转换为 Varlet `--hsl-*` 变量所需的 `H, S%, L%` 格式。
 * @param hex 十六进制颜色值。
 * @returns `H, S%, L%` 字符串, 无法解析时返回 undefined。
 */
export function convertHexToVarletHsl(hex: string) {
	const rgb = parseHexColor(hex)
	if (!rgb) return
	const [r, g, b] = rgb.map((value) => value / 255) as [number, number, number]
	const max = Math.max(r, g, b)
	const min = Math.min(r, g, b)
	const delta = max - min
	const lightness = (max + min) / 2

	let hue = 0
	let saturation = 0
	if (delta !== 0) {
		saturation = delta / (1 - Math.abs(2 * lightness - 1))
		if (max === r) {
			hue = ((g - b) / delta) % 6
		} else if (max === g) {
			hue = (b - r) / delta + 2
		} else {
			hue = (r - g) / delta + 4
		}
		hue *= 60
		if (hue < 0) hue += 360
	}

	return `${Math.round(hue)}, ${Math.round(saturation * 100)}%, ${Math.round(lightness * 100)}%`
}

/**
 * 将项目主题色同步到 Varlet 设计变量。
 * - Varlet 组件同时使用 `--color-*` (完整色值) 与 `--hsl-*` (H, S%, L%) 变量,
 *   此处根据主题中的十六进制色值同时推导两者, 保证项目主题与组件库配色一致
 * - 需在 `Theme.mount` 之后调用, 主题变化时会自动更新
 * @param theme 项目主题实例。
 */
export function syncVarletTheme(theme: Theme) {
	watchEffect(() => {
		const { color } = theme.style
		for (const [field, tokens] of Object.entries(varletColorMap)) {
			const value = color[field as keyof typeof color]
			if (!value) continue
			const hsl = convertHexToVarletHsl(value)
			for (const token of tokens) {
				document.documentElement.style.setProperty(`--color-${token}`, value)
				if (hsl) {
					document.documentElement.style.setProperty(`--hsl-${token}`, hsl)
				}
			}
		}
	})
}
