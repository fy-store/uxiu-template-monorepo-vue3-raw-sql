import type { ThemePreset } from '@/config/themes'
import { defaultThemePreset, getThemePresetById, themePresets } from '@/config/themes'
import { persistenceKeys } from '@/config/persistence'
import { _theme } from '@/config/config'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

/**
 * 主题状态
 * - 切换主题时同步更新 Theme 实例的 CSS 变量, 并写入 localStorage
 * - 页面刷新后由 config 初始化时按持久化 id 恢复, 与这里读取的初始值保持一致
 */
export const useTheme = defineStore('theme', () => {
	/** 当前主题 id */
	const currentId = ref(getThemePresetById(localStorage.getItem(persistenceKeys.THEME))?.style.id ?? defaultThemePreset.style.id)
	/** 当前主题预设 */
	const current = computed(() => getThemePresetById(currentId.value) ?? defaultThemePreset)

	/** 应用主题到页面, 不处理存储 */
	function applyTheme(preset: ThemePreset) {
		_theme.setStyle(preset.style)
		currentId.value = preset.style.id
	}

	/** 主题变化时写入本地, 保证下次启动即时恢复 */
	watch(currentId, (id) => localStorage.setItem(persistenceKeys.THEME, id), { flush: 'sync' })

	/** 切换主题: 立即生效并持久化 */
	function setTheme(id: string) {
		const preset = getThemePresetById(id)
		if (!preset || preset.style.id === currentId.value) return
		applyTheme(preset)
	}

	return {
		/** 可选主题列表 */
		list: themePresets,
		currentId,
		current,
		setTheme
	}
})
