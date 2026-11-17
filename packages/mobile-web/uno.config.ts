import { defineConfig, presetWind3 } from 'unocss'
import type { Preset } from 'unocss'
import presetRemToPx from '@unocss/preset-rem-to-px'
import { presetVarlet } from '@varlet/preset-unocss'

export default defineConfig({
	presets: [
		// 基础工具类
		presetWind3(),
		// 将工具类中的 rem 输出为 px, 统一交给 postcss 转换为 vmin
		// 注: 以下两个 preset 依赖的 @unocss/core 与项目锁定版本存在类型定义差异, 仅做类型兼容
		presetRemToPx() as unknown as Preset,
		// Varlet 设计变量工具类, 如 text-primary / bg-surface
		presetVarlet() as unknown as Preset
	]
})
