<template>
	<div class="h-full box-border flex flex-col p-20px">
		<div class="settings-panel box-border flex-1 rounded-4px bg-white p-30px">
			<div class="mb-24px flex flex-wrap items-start justify-between gap-12px">
				<div>
					<h2 class="m-0 text-20px font-600">个性化设置</h2>
					<p class="mt-6px mb-0 text-13px" style="color: var(--theme-color-text-secondary)">
						选择喜欢的界面主题，设置会保存在当前浏览器中。
					</p>
				</div>
				<div class="flex flex-wrap items-center gap-10px">
					<span class="text-13px" style="color: var(--theme-color-text-secondary)">
						当前主题: {{ theme.current.name }}
					</span>
					<el-button :disabled="theme.currentId === defaultThemePreset.style.id" @click="resetTheme">
						<i-ep-refresh class="mr-5px text-12px" />恢复默认
					</el-button>
				</div>
			</div>

			<div class="theme-grid">
				<button
					v-for="preset in theme.list"
					:key="preset.style.id"
					type="button"
					class="theme-card"
					:class="{ 'is-active': preset.style.id === theme.currentId }"
					@click="selectTheme(preset.style.id)"
				>
					<div class="theme-preview" :style="{ background: preset.style.color.background }">
						<div class="theme-sidebar" :style="{ background: preset.style.color.primary }"></div>
						<div
							class="theme-content"
							:style="{ background: preset.style.color.surface, borderColor: preset.style.color.border }"
						>
							<div class="theme-bar" :style="{ background: preset.style.color.secondary }"></div>
							<div class="theme-line" :style="{ background: preset.style.color.primary }"></div>
							<div class="theme-line short" :style="{ background: preset.style.color.info }"></div>
						</div>
					</div>
					<div class="theme-info" :style="{ borderColor: preset.style.color.border }">
						<div class="theme-name" :style="{ color: preset.style.color.text }">
							<span>{{ preset.name }}</span>
							<el-icon v-if="preset.style.id === theme.currentId" class="theme-check">
								<i-ep-check />
							</el-icon>
						</div>
						<div class="theme-desc" :style="{ color: preset.style.color.textSecondary }">{{ preset.desc }}</div>
					</div>
				</button>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
	import { defaultThemePreset } from '@/config'
	import { useTheme } from '@/stores'

	const theme = useTheme()

	/**
	 * 切换界面主题。
	 * @param id 主题 id。
	 */
	function selectTheme(id: string) {
		theme.setTheme(id)
	}

	/** 恢复默认主题 */
	function resetTheme() {
		selectTheme(defaultThemePreset.style.id)
	}
</script>

<style scoped lang="scss">
	.settings-panel {
		border: 1px solid var(--theme-color-border);
	}

	.theme-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
		gap: 16px;
	}

	.theme-card {
		overflow: hidden;
		padding: 0;
		border: 1px solid var(--theme-color-border);
		border-radius: 8px;
		background: transparent;
		cursor: pointer;
		text-align: left;
		transition:
			transform 0.2s,
			box-shadow 0.2s,
			border-color 0.2s;

		&:hover {
			transform: translateY(-2px);
			box-shadow: var(--theme-shadow-md);
		}

		&.is-active {
			border-color: var(--theme-color-primary);
			box-shadow: 0 0 0 1px var(--theme-color-primary);
		}
	}

	.theme-preview {
		display: flex;
		gap: 8px;
		height: 96px;
		padding: 12px;
		box-sizing: border-box;
	}

	.theme-sidebar {
		width: 28%;
		border-radius: 4px;
	}

	.theme-content {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 8px;
		padding: 10px;
		border: 1px solid;
		border-radius: 4px;
		box-sizing: border-box;
	}

	.theme-bar {
		height: 12px;
		border-radius: 3px;
		opacity: 0.85;
	}

	.theme-line {
		width: 70%;
		height: 8px;
		border-radius: 999px;
		opacity: 0.9;

		&.short {
			width: 45%;
			opacity: 0.6;
		}
	}

	.theme-info {
		padding: 12px 14px;
		border-top: 1px solid;
	}

	.theme-name {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 14px;
		font-weight: 600;
	}

	.theme-desc {
		margin-top: 4px;
		font-size: 12px;
	}

	.theme-check {
		color: var(--theme-color-primary);
	}
</style>
