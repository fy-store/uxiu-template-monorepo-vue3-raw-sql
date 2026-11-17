import type { ThemePreset } from '@/config/themes'
import { defaultThemePreset, getThemePresetById, themePresets } from '@/config/themes'
import { persistenceKeys } from '@/config/persistence'
import { _theme } from '@/config/config'
import { personalization } from '@/api'
import { ElMessage } from 'element-plus'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

/**
 * 主题状态
 * - 切换主题时立即更新 Theme 实例的 CSS 变量, 并写入 localStorage 作为启动缓存
 * - 登录后从后端加载当前账号的个性化配置并覆盖本地主题
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

	/** 切换主题: 立即生效并持久化到后端 */
	async function setTheme(id: string) {
		const preset = getThemePresetById(id)
		if (!preset) return false
		if (preset.style.id !== currentId.value) {
			applyTheme(preset)
		}

		// 未登录时不请求后端, 登录后会从后端加载配置
		if (!localStorage.getItem(persistenceKeys.TOKEN)) return true

		const { code, msg } = await personalization.updateMine({ themeId: preset.style.id })
		if (code !== 0) {
			ElMessage.error(msg || '主题保存失败')
			return false
		}
		return true
	}

	/** 从后端加载当前账号的个性化配置 */
	async function refreshFromServer() {
		const { code, data } = await personalization.getMine()
		if (code !== 0 || !data?.themeId) return
		const preset = getThemePresetById(data.themeId)
		if (preset) {
			applyTheme(preset)
		}
	}

	return {
		/** 可选主题列表 */
		list: themePresets,
		currentId,
		current,
		setTheme,
		refreshFromServer
	}
})
