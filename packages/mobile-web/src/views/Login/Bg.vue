<template>
	<div class="bg-container" aria-hidden="true">
		<div class="bubble"></div>
	</div>
</template>

<script lang="ts" setup></script>

<style scoped lang="scss">
	// 样式颜色计算使用了 color-mix 函数，该函数支持 2023 往后的主流浏览器
	.bg-container {
		position: fixed;
		inset: 0;
		z-index: 0;
		overflow: hidden;
		pointer-events: none;

		/* 使用主题色与自定义浅色构建背景渐变 */
		background: radial-gradient(
				1200px circle at 85% 10%,
				color-mix(in srgb, var(--theme-color-primary) 14%, transparent),
				transparent 60%
			),
			linear-gradient(
				135deg,
				color-mix(in srgb, white 10%, var(--theme-custom-tintColor)) 0%,
				color-mix(in srgb, white 5%, var(--theme-custom-tintColor)) 40%,
				var(--theme-custom-tintColor) 100%
			);
	}

	.bubble {
		position: absolute;
		border-radius: 50%;
		will-change: transform, filter;
		border: 1.5px solid color-mix(in srgb, var(--theme-color-primary) 45%, transparent);
		background-clip: padding-box;
		filter: drop-shadow(0 10px 50px color-mix(in srgb, var(--theme-color-primary) 22%, transparent))
			drop-shadow(0 0 80px color-mix(in srgb, var(--theme-color-primary) 18%, transparent));
		// 内部体积感
		box-shadow: 0 0 0 1px color-mix(in srgb, var(--theme-color-primary) 28%, transparent),
			inset -60px -80px 160px color-mix(in srgb, var(--theme-color-primary) 22%, transparent),
			inset 40px 60px 120px color-mix(in srgb, var(--theme-color-surface) 33%, transparent);
	}

	.bubble {
		--size: 130vmax;
		width: var(--size);
		height: var(--size);
		top: -20vh;
		left: calc(-0.7 * var(--size));

		background: radial-gradient(
			closest-side at 46% 46%,
			color-mix(in srgb, var(--theme-color-primary) 98%, transparent),
			color-mix(in srgb, var(--theme-color-primary) 92%, transparent) 60%,
			color-mix(in srgb, var(--theme-color-primary) 86%, transparent) 99%
		);
	}
</style>
