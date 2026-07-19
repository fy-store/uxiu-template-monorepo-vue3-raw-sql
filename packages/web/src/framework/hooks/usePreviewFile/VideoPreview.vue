<template>
	<div class="center h-full w-full preview-bg-dark" v-loading="loading">
		<!-- xgplayer 接管容器（非片段视频） -->
		<div v-if="!props.isFragment" ref="xgContainerRef" class="h-full w-full"></div>
		<!-- 原生 video 元素（片段视频） -->
		<video v-else ref="videoRef" class="native-video h-full w-full" controls playsinline></video>
	</div>
</template>

<script setup lang="ts">
	import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
	import Player from 'xgplayer'
	import 'xgplayer/dist/index.min.css'
	import Mp4Plugin from 'xgplayer-mp4'
	import { FragmentVideoPlayer } from './FragmentVideoPlayer'

	const props = defineProps<{
		src: string
		isFragment: boolean
		folderUrl?: string
		/**
		 * 获取并解密指定视频片段。
		 * @param filename 片段文件名。
		 * @returns 解密后的片段数据。
		 */
		decryptFragment?: (filename: string) => Promise<ArrayBuffer>
		manifestIndex?: string
	}>()

	const emit = defineEmits<{
		ready: []
	}>()

	const xgContainerRef = ref<HTMLDivElement | null>(null)
	const videoRef = ref<HTMLVideoElement | null>(null)
	const loading = ref(true)

	let xgPlayer: Player | null = null
	let fragmentPlayer: FragmentVideoPlayer | null = null
	let disposed = false
	let initVersion = 0
	let initAbortController: AbortController | null = null

	onMounted(async () => {
		await nextTick()
		try {
			if (props.isFragment && props.folderUrl) {
				await initFragmentPlayer()
			} else if (props.src) {
				await initXgPlayer()
			} else {
				loading.value = false
			}
		} catch (err) {
			console.error('VideoPreview init error -> ', err)
			loading.value = false
		}
	})

	onBeforeUnmount(() => {
		disposed = true
		destroyPlayers()
	})

	watch(() => props.src, () => {
		destroyPlayers()
		if (!disposed && props.src && !props.isFragment) {
			nextTick(() => initXgPlayer())
		}
	})

	/**
	 * 初始化基于 DASH 清单的片段视频播放器。
	 */
	async function initFragmentPlayer() {
		if (disposed || !videoRef.value || !props.folderUrl) return

		const version = ++initVersion
		const abortController = new AbortController()
		initAbortController = abortController
		const player = new FragmentVideoPlayer({
			videoElement: videoRef.value,
			folderUrl: props.folderUrl,
			fetchFragment: props.decryptFragment,
			manifestIndex: props.manifestIndex
		})
		fragmentPlayer = player

		try {
			const indexData = await FragmentVideoPlayer.fetchIndexJson(props.folderUrl, abortController.signal)
			if (!indexData.indexList?.length) {
				throw new Error('index.json 中 indexList 为空')
			}
			if (disposed || version !== initVersion) {
				await player.destroy()
				return
			}

			await player.load(indexData.indexList)
			if (disposed || version !== initVersion) {
				await player.destroy()
				if (fragmentPlayer === player) {
					fragmentPlayer = null
				}
				return
			}
			emit('ready')
		} catch (err) {
			if (fragmentPlayer === player) {
				fragmentPlayer = null
			}
			await player.destroy()
			if (disposed || version !== initVersion) return
			console.error('Fragment player load error -> ', err)
			throw err
		} finally {
			if (initAbortController === abortController) {
				initAbortController = null
			}
			loading.value = false
		}
	}

	/**
	 * 初始化普通视频使用的 xgplayer 实例。
	 */
	async function initXgPlayer() {
		if (disposed || !xgContainerRef.value || !props.src) {
			loading.value = false
			return
		}

		// 等待 DOM 更新确保容器可用
		await nextTick()
		if (disposed || !xgContainerRef.value) return

		const version = ++initVersion
		const player = new Player({
			el: xgContainerRef.value,
			url: props.src,
			isLive: false,
			autoplay: false,
			fluid: true,
			videoInit: true,
			playsinline: true,
			plugins: [Mp4Plugin]
		})
		if (disposed || version !== initVersion) {
			player.destroy()
			return
		}
		xgPlayer = player

		player.once('canplay', () => {
			if (disposed || version !== initVersion) return
			loading.value = false
			emit('ready')
		})

		player.once('error', () => {
			if (disposed || version !== initVersion) return
			loading.value = false
		})
	}

	/**
	 * 销毁普通视频和片段视频播放器实例。
	 */
	function destroyPlayers() {
		initVersion++
		initAbortController?.abort()
		initAbortController = null

		if (xgPlayer) {
			xgPlayer.destroy()
			xgPlayer = null
		}

		if (fragmentPlayer) {
			void fragmentPlayer.destroy()
			fragmentPlayer = null
		}
	}
</script>

<style scoped>
	.center {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.preview-bg-dark {
		background-color: #000;
	}

	.native-video {
		display: block;
		outline: none;
		width: 100%;
		height: 100%;
	}
</style>
