<template>
	<el-dialog
		v-model="visible"
		width="80vw"
		:top="'5vh'"
		append-to-body
		:close-on-click-modal="false"
		class="sys-preview-file-dialog h-90vh min-h-400px min-w-600px flex flex-col"
		:class="props.customClass"
		@close="disposeRuntimeResources"
		@closed="onClosed"
	>
		<template #header>
			<div class="header">
				<div class="title ellipsis" :title="displayName">
					{{ displayName }}
					<span v-if="isDecrypted" class="ml-10px text-12px" style="color: var(--el-color-warning)">(已解密)</span>
				</div>
				<DownloadActions
					v-model:mode="downloadMode"
					:encrypted="props.isEncrypted"
					:decrypted="isDecrypted"
					:original-disabled="originalDownloadDisabled"
					:loading="loading"
					:download-status="downloadStatus"
					:progress="downloadProgress.percentage"
					@original="handleOriginalDownload"
					@decrypt="handleDecryptDownload"
					@preview="handleDecryptClick('preview')"
					@toggle-pause="toggleDownloadPause"
					@cancel="cancelDownload"
				/>
			</div>
		</template>

		<div
			class="body h-full w-full flex-1 overflow-hidden"
			v-loading="loading"
			element-loading-text="正在处理数据..."
		>
			<!-- 已解密或非加密文件，展示预览 -->
			<template v-if="previewReady">
				<ImagePreview v-if="type === 'image'" :src="previewSrc" />
				<VideoPreview
					v-else-if="type === 'video'"
					:src="previewSrc"
					:is-fragment="props.isFragment"
					:folder-url="props.isFragment ? props.url : void 0"
					:decrypt-fragment="decryptFragmentFn"
					:manifest-index="videoManifest.manifestIndex"
					@ready="onVideoReady"
				/>
				<PdfPreview v-else-if="type === 'pdf'" :src="previewSrc" />
				<TextPreview v-else-if="type === 'text'" :src="previewSrc" />
				<UnknownPreview
					v-else
				/>
			</template>

			<!-- 加密且未解密 -->
			<template v-else-if="props.isEncrypted && !isDecrypted">
				<div class="center h-full w-full flex flex-col preview-bg-light preview-text-empty">
					<i-ep-lock class="icon-empty mb-10px" />
					<div>该文件已加密，请使用顶部操作解密文件</div>
				</div>
			</template>

			<!-- 没有任何数据 -->
			<template v-else>
				<div class="center h-full w-full flex flex-col preview-bg-light preview-text-empty">
					<i-ep-document class="icon-empty mb-10px" />
					<div class="mb-20px">暂无预览内容</div>
				</div>
			</template>
		</div>

		<PasswordDialog v-model:visible="pwdDialogVisible" @confirm="onPwdConfirm" />
	</el-dialog>
</template>

<script setup lang="ts">
	import type { DownloadMode, TemplateProps, InitDecryptContext } from './types'
	import type { DownloadTaskSource } from './downloadTaskTypes'
	import { computed, ref, onBeforeUnmount, watch } from 'vue'
	import { persistenceKeys } from '@/config'
	import { Path } from '@/utils'
	import { ElMessage } from 'element-plus'
	import DownloadActions from './DownloadActions.vue'
	import PasswordDialog from './PasswordDialog.vue'
	import ImagePreview from './ImagePreview.vue'
	import VideoPreview from './VideoPreview.vue'
	import PdfPreview from './PdfPreview.vue'
	import TextPreview from './TextPreview.vue'
	import UnknownPreview from './UnknownPreview.vue'
	import {
		downloadByAnchor,
		getFileRequestUrl,
		getSafeDownloadName,
		isAbortError,
		selectDownloadDir
	} from './download'
	import { useDownloadTask } from './useDownloadTask'
	import './styles.scss'

	type Action = 'preview' | 'download'

	const props = defineProps<TemplateProps>()
	const emit = defineEmits<{ 'update:visible': [value: boolean] }>()

	/** 获取或更新预览弹窗的显示状态。 */
	const visible = computed({
		get: () => props.visible,
		set: (v: boolean) => emit('update:visible', v)
	})

	// ---- 解密状态 ----
	const localPassword = ref(props.password || '')
	const pwdDialogVisible = ref(false)
	const loading = ref(false)
	const decryptAction = ref<Action>('preview')
	const downloadMode = ref<DownloadMode>(getStoredDownloadMode())
	const {
		status: downloadStatus,
		progress: downloadProgress,
		run: runDownloadTask,
		togglePause: toggleDownloadPause,
		cancel: cancelDownload,
		destroy: destroyDownloadTask
	} = useDownloadTask()

	watch(downloadMode, (value) => {
		localStorage.setItem(persistenceKeys.previewFileDownloadMode, value)
	})

	// 解密后的信息
	const decryptedName = ref('')
	const decryptedExt = ref('')
	const decryptedMimeType = ref('')
	const decryptBlobUrl = ref('')
	const decryptedBlob = ref<Blob | null>(null)
	/** 用于片段视频解密的函数 */
	const decryptFragmentFn = ref<((filename: string) => Promise<ArrayBuffer>) | undefined>(void 0)
	let decryptWorker: Worker | null = null
	let decryptRequestId = 0
	let disposed = false
	const previewAbortControllers = new Set<AbortController>()
	const decryptCallbacks = new Map<number, (result: ArrayBuffer | Error) => void>()
	/** VideoManifest 信息，从 meta 中解密得到 */
	const videoManifest = ref<{
		width?: number
		height?: number
		segmentCount?: number
		duration?: number
		manifestIndex?: string
	}>({})

	// ---- 计算属性 ----
	/** 获取包含扩展名的原始文件名。 */
	const originalName = computed(() => {
		if (!props.name) {
			const info = Path.getFilenameInfo(props.url)
			return info.name + info.ext
		}
		// props.name 不包含扩展名，props.ext 才是扩展名（含点）
		return props.name + (props.ext || '')
	})

	/** 获取优先使用解密信息的展示文件名。 */
	const displayName = computed(() => {
		if (decryptedName.value) return decryptedName.value
		if (decryptedExt.value) {
			const info = Path.getFilenameInfo(originalName.value)
			return `${info.name}${decryptedExt.value}`
		}
		return originalName.value
	})

	/** 获取用于判断预览类型的文件扩展名。 */
	const fileExt = computed(() => {
		if (decryptedExt.value) return decryptedExt.value
		// 优先使用 props.ext（含点，如 .jpg），fallback 从文件名解析
		if (props.ext) return props.ext.toLowerCase()
		return Path.getExt(displayName.value).toLowerCase()
	})

	/** 根据扩展名和 MIME 类型获取预览组件类型。 */
	const type = computed(() => {
		const ext = fileExt.value
		if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'].includes(ext)) return 'image'
		if (['.mp4', '.webm', '.ogg'].includes(ext)) return 'video'
		if (ext === '.pdf') return 'pdf'
		if (['.txt', '.md', '.json', '.xml', '.html', '.css', '.js', '.ts', '.vue', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.log', '.csv'].includes(ext)) return 'text'

		const mimeType = decryptedMimeType.value.toLowerCase()
		if (mimeType.startsWith('image/')) return 'image'
		if (mimeType.startsWith('video/')) return 'video'
		if (mimeType === 'application/pdf') return 'pdf'

		return 'unknown'
	})

	/** 判断当前加密文件是否已完成内容解密。 */
	const isDecrypted = computed(() => {
		if (!props.isEncrypted) return false
		if (props.isFragment) return !!decryptFragmentFn.value
		return !!decryptedBlob.value
	})

	/** 判断原始下载是否需要禁用。 */
	const originalDownloadDisabled = computed(() => {
		return props.isEncrypted && !isDecrypted.value
	})

	/** 判断文件是否已具备预览条件。 */
	const previewReady = computed(() => {
		if (!props.isEncrypted) {
			// 非加密：只要有 url 或片段信息即可
			if (props.isFragment && props.url) return true
			return !!props.url
		}
		// 加密：已解密且有预览源
		if (props.isFragment) {
			return isDecrypted.value
		}
		return !!decryptBlobUrl.value
	})

	/** 获取当前文件对应的预览源 URL。 */
	const previewSrc = computed(() => {
		if (props.isEncrypted) {
			if (props.isFragment) {
				// 片段加密视频使用文件夹 URL，由 VideoPreview 内部处理
				return ''
			}
			return decryptBlobUrl.value || ''
		}
		return props.url
	})

	// ---- 生命周期 ----
	onBeforeUnmount(() => {
		disposeRuntimeResources()
	})

	// ---- 方法 ----
	/**
	 * 获取用户上次选择的下载方式。
	 * @returns 已持久化的下载方式，无有效值时使用普通下载。
	 */
	function getStoredDownloadMode(): DownloadMode {
		const value = localStorage.getItem(persistenceKeys.previewFileDownloadMode)
		return value === 'directory' ? 'directory' : 'browser'
	}

	/**
	 * 释放当前解密文件创建的 Blob URL。
	 */
	function revokeUrl() {
		if (decryptBlobUrl.value && decryptBlobUrl.value.startsWith('blob:')) {
			URL.revokeObjectURL(decryptBlobUrl.value)
			decryptBlobUrl.value = ''
		}
		decryptedBlob.value = null
	}

	/**
	 * 处理预览弹窗关闭后的资源清理。
	 */
	function onClosed() {
		revokeUrl()
		decryptFragmentFn.value = void 0
		disposeRuntimeResources()
	}

	/**
	 * 释放预览运行期间创建的请求、Worker 和下载任务。
	 */
	function disposeRuntimeResources() {
		if (disposed) return

		disposed = true
		previewAbortControllers.forEach((controller) => controller.abort())
		previewAbortControllers.clear()
		clearDecryptWorker()
		destroyDownloadTask()
		revokeUrl()
		decryptFragmentFn.value = void 0
	}

	/**
	 * 终止解密 Worker，并用指定错误结束所有等待中的任务。
	 * @param error 传递给等待中解密任务的错误。
	 */
	function clearDecryptWorker(error = new Error('解密任务已取消')) {
		if (decryptWorker) {
			decryptWorker.onmessage = null
			decryptWorker.onerror = null
			decryptWorker.onmessageerror = null
			decryptWorker.terminate()
			decryptWorker = null
		}

		decryptCallbacks.forEach((cb) => cb(error))
		decryptCallbacks.clear()
	}

	/**
	 * 检查预览组件是否已进入销毁状态。
	 */
	function throwIfDisposed() {
		if (disposed) {
			throw new DOMException('预览已关闭', 'AbortError')
		}
	}

	/**
	 * 读取随预览生命周期自动取消的文件响应。
	 * @param url 请求地址。
	 * @param reader 响应读取方法。
	 * @returns 响应读取结果。
	 */
	async function readPreviewResource<T>(url: string, reader: (response: Response) => Promise<T>) {
		throwIfDisposed()
		const controller = new AbortController()
		previewAbortControllers.add(controller)

		try {
			const response = await fetch(url, {
				credentials: 'include',
				signal: controller.signal
			})
			throwIfDisposed()
			const result = await reader(response)
			throwIfDisposed()
			return result
		} finally {
			previewAbortControllers.delete(controller)
		}
	}

	/**
	 * 标记视频预览已准备完成。
	 */
	function onVideoReady() {
		loading.value = false
	}

	/**
	 * 获取片段目录索引。
	 * @returns 片段文件名列表。
	 */
	async function getFragmentIndexList() {
		const indexData = await readPreviewResource(
			`${props.url.replace(/\/+$/, '')}/index.json`,
			async (response) => {
				if (!response.ok) {
					throw new Error(`获取片段索引失败: ${response.status}`)
				}
				return response.json()
			}
		)
		if (!indexData.indexList?.length) {
			throw new Error('片段清单为空')
		}
		return indexData.indexList
	}

	/**
	 * 获取当前文件的 Worker 下载源。
	 * @param name 响应头使用的下载文件名。
	 * @returns 单文件 URL 或片段目录下载源。
	 */
	function getDownloadSource(name: string): DownloadTaskSource {
		if (props.isFragment) {
			return {
				type: 'fragments',
				folderUrl: props.url
			}
		}

		return {
			type: 'url',
			url: getFileRequestUrl(props.url, name, 'inline')
		}
	}

	/**
	 * 使用 Worker 下载、合并并保存文件。
	 * @param name 保存文件名。
	 * @param password 可选解密密码。
	 * @param directoryHandle 可选目录句柄。
	 * @returns 是否完成下载。
	 */
	async function executeDownload(
		name: string,
		password?: string,
		directoryHandle?: FileSystemDirectoryHandle
	) {
		const filename = getSafeDownloadName(name)
		const result = await runDownloadTask({
			source: getDownloadSource(filename),
			filename,
			mimeType: password ? decryptedMimeType.value : props.file?.type,
			password,
			manifestIndex: password && props.isFragment ? videoManifest.value.manifestIndex : void 0,
			directoryHandle
		})

		if (!result || disposed) return false

		if (result.buffer) {
			const blob = new Blob([result.buffer], {
				type: result.mimeType
			})
			downloadByAnchor(URL.createObjectURL(blob), filename, true)
			ElMessage.success('下载完成')
		} else {
			ElMessage.success('文件已保存到所选文件夹')
		}

		return true
	}

	/**
	 * 下载原始文件。
	 */
	async function handleOriginalDownload() {
		if (originalDownloadDisabled.value || downloadStatus.value !== 'idle') return

		try {
			const dirHandle = downloadMode.value === 'directory' ? await selectDownloadDir() : void 0
			await executeDownload(originalName.value, void 0, dirHandle)
		} catch (error) {
			if (!disposed && !isAbortError(error)) {
				ElMessage.error(error instanceof Error ? error.message : '原始文件下载失败')
			}
		}
	}

	/**
	 * 记录解密动作并打开密码输入弹窗。
	 * @param action 解密后执行预览或下载。
	 */
	function handleDecryptClick(action: Action) {
		decryptAction.value = action
		pwdDialogVisible.value = true
	}

	/**
	 * 下载已解密文件，未解密时先打开密码输入弹窗。
	 */
	async function handleDecryptDownload() {
		if (downloadStatus.value !== 'idle') return
		if (!isDecrypted.value) {
			handleDecryptClick('download')
			return
		}

		try {
			const dirHandle = downloadMode.value === 'directory' ? await selectDownloadDir() : void 0
			await downloadDecryptedFile(localPassword.value, dirHandle)
		} catch (error) {
			if (!disposed && !isAbortError(error)) {
				ElMessage.error(error instanceof Error ? error.message : '解密文件下载失败')
			}
		}
	}

	/**
	 * 创建或复用解密 Worker，并使用当前密码完成初始化。
	 * @param password 文件解密密码。
	 * @returns 解密 Worker 实例。
	 */
	function getDecryptWorker(password: string) {
		throwIfDisposed()
		if (!decryptWorker) {
			decryptWorker = new Worker(new URL('./decryptWorker.ts', import.meta.url), { type: 'module' })
			decryptWorker.onmessage = (e: MessageEvent) => {
				const d = e.data
				if (d.type !== 'decrypt' && d.type !== 'error') return

				const cb = decryptCallbacks.get(d.requestId)
				if (!cb) return

				decryptCallbacks.delete(d.requestId)
				if (d.type === 'error') {
					cb(new Error(d.error as string))
				} else {
					cb(d.buffer as ArrayBuffer)
				}
			}
			decryptWorker.onerror = (event) => {
				clearDecryptWorker(new Error(event.message || '解密 Worker 执行失败'))
			}
			decryptWorker.onmessageerror = () => {
				clearDecryptWorker(new Error('解密 Worker 消息解析失败'))
			}
		}

		decryptWorker.postMessage({ type: 'init', password })
		return decryptWorker
	}

	/**
	 * 将 ArrayBuffer 转移到 Worker 中执行解密。
	 * @param buffer 待解密的二进制数据。
	 * @param password 文件解密密码。
	 * @returns 解密后的二进制数据。
	 */
	function decryptArrayBufferInWorker(buffer: ArrayBuffer, password: string) {
		throwIfDisposed()
		const worker = getDecryptWorker(password)
		const requestId = ++decryptRequestId

		return new Promise<ArrayBuffer>((resolve, reject) => {
			decryptCallbacks.set(requestId, (result) => {
				if (result instanceof Error) {
					reject(result)
				} else {
					resolve(result)
				}
			})

			try {
				worker.postMessage({ type: 'decrypt', password, buffer, requestId }, [buffer])
			} catch (err) {
				decryptCallbacks.delete(requestId)
				reject(err)
			}
		})
	}

	/**
	 * 使用密码初始化解密后的文件信息。
	 * @param password 文件解密密码。
	 */
	async function initDecryptInfo(password: string) {
		throwIfDisposed()
		if (!props.initDecrypt) return

		const ctx: InitDecryptContext = {
			password,
			setName: (value) => {
				decryptedName.value = value
			},
			setExt: (value) => {
				decryptedExt.value = value
			},
			setMimeType: (value) => {
				decryptedMimeType.value = value
			},
			setIsFragment: () => {},
			setVideoManifest: (value) => {
				videoManifest.value = value
			}
		}
		await props.initDecrypt(ctx)
		throwIfDisposed()
	}

	/**
	 * 解密单个非片段文件，并按当前动作预览或下载。
	 * @param password 文件解密密码。
	 */
	async function doDecrypt(password: string): Promise<void> {
		await initDecryptInfo(password)

		const encryptedBuffer = await readPreviewResource(props.url, async (response) => {
			if (!response.ok) throw new Error(`文件下载失败: ${response.status}`)
			return response.arrayBuffer()
		})
		const decrypted = await decryptArrayBufferInWorker(encryptedBuffer, password)
		throwIfDisposed()

		const blob = new Blob([decrypted], {
			type: decryptedMimeType.value || 'application/octet-stream'
		})
		revokeUrl()
		decryptedBlob.value = blob
		decryptBlobUrl.value = URL.createObjectURL(blob)
		localPassword.value = password
	}

	/**
	 * 验证片段文件密码，并创建供视频播放器按需调用的片段解密函数。
	 * @param password 文件解密密码。
	 */
	async function doDecryptFragment(password: string): Promise<void> {
		await initDecryptInfo(password)

		const indexList = await getFragmentIndexList()

		// 尝试解密第一个文件以验证密码正确性
		const firstName = indexList[0]
		if (!firstName) throw new Error('片段清单为空')
		const firstUrl = `${props.url.replace(/\/+$/, '')}/${encodeURIComponent(firstName)}`
		const firstBuf = await readPreviewResource(firstUrl, async (response) => {
			if (!response.ok) throw new Error(`获取片段失败: ${response.status}`)
			return response.arrayBuffer()
		})
		await decryptArrayBufferInWorker(firstBuf, password)
		throwIfDisposed()

		localPassword.value = password

		// 创建解密函数供 VideoPreview 使用
		decryptFragmentFn.value = async (filename: string) => {
			const fileUrl = `${props.url.replace(/\/+$/, '')}/${encodeURIComponent(filename)}`
			const buffer = await readPreviewResource(fileUrl, async (response) => {
				if (!response.ok) throw new Error(`获取片段失败: ${response.status}`)
				return response.arrayBuffer()
			})
			return decryptArrayBufferInWorker(buffer, password)
		}
	}

	/**
	 * 使用 Worker 下载已解密文件。
	 * @param password 文件解密密码。
	 * @param dirHandle 已选择的目录句柄。
	 * @returns 是否完成下载。
	 */
	async function downloadDecryptedFile(password: string, dirHandle?: FileSystemDirectoryHandle) {
		if (!password) {
			throw new Error('请先解密文件')
		}

		await initDecryptInfo(password)

		const completed = await executeDownload(displayName.value, password, dirHandle)
		if (completed) {
			localPassword.value = password
		}
		return completed
	}

	/**
	 * 根据文件存储方式执行解密，并处理下载完成状态。
	 * @param password 用户输入的解密密码。
	 */
	async function onPwdConfirm(password: string) {
		pwdDialogVisible.value = false

		if (decryptAction.value === 'download') {
			try {
				const dirHandle = downloadMode.value === 'directory' ? await selectDownloadDir() : void 0
				await downloadDecryptedFile(password, dirHandle)
			} catch (error) {
				if (!disposed && !isAbortError(error)) {
					console.error('download decrypt error -> ', error)
					ElMessage.error(error instanceof Error ? error.message : '解密下载失败，请检查密码是否正确')
				}
			}
			return
		}

		loading.value = true
		try {
			if (props.isFragment) {
				await doDecryptFragment(password)
			} else {
				await doDecrypt(password)
			}
		} catch (error) {
			if (!disposed && !isAbortError(error)) {
				console.error('decrypt error -> ', error)
				ElMessage.error(error instanceof Error ? error.message : '解密失败，请检查密码是否正确')
			}
		} finally {
			loading.value = false
		}
	}
</script>

<style scoped lang="scss" src="./Template.scss"></style>
