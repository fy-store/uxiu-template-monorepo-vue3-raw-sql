import shaka from 'shaka-player'

export interface FragmentVideoPlayerOptions {
	/** 视频容器元素 */
	videoElement: HTMLVideoElement
	/** 片段文件夹 URL, 与 fragmentUrls 至少提供一个 */
	folderUrl?: string
	/** 片段名到访问地址的映射, 优先于 folderUrl 拼接 */
	fragmentUrls?: Map<string, string>
	/** 自定义片段获取函数（如解密） */
	fetchFragment?: (filename: string, signal?: AbortSignal) => Promise<ArrayBuffer>
	/** 加密片段存储中 MPD 文件的索引名 */
	manifestIndex?: string
}

let schemeSeed = 0

/**
 * 判断字符串是否包含 URI scheme。
 * @param value 待检查的 URI。
 * @returns 是否包含合法 scheme。
 */
function hasUriScheme(value: string) {
	return /^[a-z][a-z0-9+.-]*:/i.test(value)
}

/**
 * 片段视频播放器
 * - 读取加密上传时生成的 DASH MPD，使用真实 SegmentTimeline 支持任意 seek
 */
export class FragmentVideoPlayer {
	private _player: shaka.Player | null = null
	private _videoElement: HTMLVideoElement
	private _folderUrl: string
	private _fragmentUrls: Map<string, string>
	private _destroyed = false
	private _fetchFragment: (filename: string, signal: AbortSignal) => Promise<ArrayBuffer>
	private _indexSet = new Set<string>()
	private _lruCache = new Map<string, ArrayBuffer>()
	private _manifestIndex?: string
	private _mpdUrl: string | null = null
	private _scheme = `fragment-video-${++schemeSeed}`
	private _schemeRegistered = false
	private _abortControllers = new Set<AbortController>()
	private _destroyTask: Promise<void> | null = null
	private static readonly LRU_CACHE_MAX = 16

	/**
	 * 创建片段视频播放器。
	 * @param options 视频元素、片段目录及可选片段读取方法。
	 */
	constructor(options: FragmentVideoPlayerOptions) {
		this._videoElement = options.videoElement
		this._folderUrl = options.folderUrl?.replace(/\/+$/, '') ?? ''
		this._fragmentUrls = options.fragmentUrls ?? new Map()
		this._manifestIndex = options.manifestIndex
		this._fetchFragment = options.fetchFragment ?? this._defaultFetch.bind(this)
	}

	/**
	 * 加载片段索引并初始化 Shaka Player。
	 * @param indexList 片段目录中允许访问的文件名列表。
	 */
	async load(indexList: string[]): Promise<void> {
		if (this._destroyed) throw new Error('FragmentVideoPlayer has been destroyed')
		if (!indexList.length) throw new Error('片段列表为空')

		this._indexSet = new Set(indexList)
		this._lruCache.clear()
		this._registerScheme()
		const player = new shaka.Player()
		this._player = player
		player.configure({
			streaming: {
				bufferingGoal: 30,
				rebufferingGoal: 2,
				bufferBehind: 30,
				retryParameters: { maxAttempts: 2 }
			}
		})
		// shaka 5 起不再通过构造函数传入媒体元素, 改为 attach 挂载
		await player.attach(this._videoElement)
		if (this._destroyed) {
			throw new DOMException('播放器已销毁', 'AbortError')
		}

		const mpdXml = await this._createMpd()
		if (this._destroyed) {
			throw new DOMException('播放器已销毁', 'AbortError')
		}
		this._mpdUrl = URL.createObjectURL(new Blob([mpdXml], { type: 'application/dash+xml' }))
		await player.load(this._mpdUrl)
		if (this._destroyed) {
			throw new DOMException('播放器已销毁', 'AbortError')
		}
	}

	/**
	 * 销毁播放器、释放 MPD URL 并注销自定义网络 scheme。
	 */
	destroy(): Promise<void> {
		if (!this._destroyTask) {
			this._destroyTask = this._destroy()
		}
		return this._destroyTask
	}

	/**
	 * 执行播放器资源销毁。
	 */
	private async _destroy() {
		this._destroyed = true
		this._lruCache.clear()
		this._abortControllers.forEach((controller) => controller.abort())
		this._abortControllers.clear()

		if (this._player) {
			try { await this._player.unload() } catch {}
			try { await this._player.destroy() } catch {}
			this._player = null
		}

		if (this._mpdUrl) {
			URL.revokeObjectURL(this._mpdUrl)
			this._mpdUrl = null
		}

		if (this._schemeRegistered) {
			try {
				;(shaka.net.NetworkingEngine as any).unregisterScheme?.(this._scheme)
			} catch {}
			this._schemeRegistered = false
		}

		this._videoElement.removeAttribute('src')
		this._videoElement.load()
	}

	/**
	 * 获取并修正 DASH MPD 内容。
	 * @returns 可供当前播放器加载的 MPD XML。
	 */
	private async _createMpd() {
		if (!this._manifestIndex || !this._indexSet.has(this._manifestIndex)) {
			throw new Error('DASH manifest 片段不存在')
		}

		const controller = new AbortController()
		this._abortControllers.add(controller)
		try {
			const manifestBuffer = await this._fetchCached(this._manifestIndex, controller.signal)
			return this._patchDashMpd(new TextDecoder().decode(manifestBuffer))
		} finally {
			this._abortControllers.delete(controller)
		}
	}

	/**
	 * 将 MPD 内相对片段地址替换为当前实例的自定义 scheme。
	 * @param text 原始 MPD XML。
	 * @returns 修正片段地址后的 MPD XML。
	 */
	private _patchDashMpd(text: string) {
		return text.replace(
			/(initialization|media)="([^"]+)"/g,
			(all, attr: string, url: string) => {
				if (!url) return all

				if (url.startsWith('fragment-video://')) {
					return `${attr}="${this._scheme}://${url.slice('fragment-video://'.length)}"`
				}

				if (url.startsWith(`${this._scheme}://`) || hasUriScheme(url) || url.startsWith('/')) {
					return all
				}

				return `${attr}="${this._scheme}://${url}"`
			}
		)
	}

	/**
	 * 注册当前实例用于读取片段的 Shaka 网络 scheme。
	 */
	private _registerScheme(): void {
		if (this._schemeRegistered) {
			return
		}

		shaka.net.NetworkingEngine.registerScheme(
			this._scheme,
			(uri, request) => {
				const filename = this._getFilenameFromUri(uri)

				if (!filename || !this._indexSet.has(filename)) {
					return shaka.util.AbortableOperation.failed(
						new shaka.util.Error(
							shaka.util.Error.Severity.RECOVERABLE,
							shaka.util.Error.Category.NETWORK,
							shaka.util.Error.Code.BAD_HTTP_STATUS,
							404,
							uri
						)
					)
				}

				const controller = new AbortController()
				this._abortControllers.add(controller)
				let canceled = false

				const task = this._fetchCached(filename, controller.signal)
					.then((data) => ({
						uri,
						originalUri: uri,
						data,
						headers: {} as Record<string, string>,
						originalRequest: request
					}))
					.catch((error) => {
						// 取消或销毁时按 shaka 约定以 OPERATION_ABORTED 结束, 避免被当成真实加载错误重试
						if (canceled || this._destroyed) {
							throw new shaka.util.Error(
								shaka.util.Error.Severity.RECOVERABLE,
								shaka.util.Error.Category.NETWORK,
								shaka.util.Error.Code.OPERATION_ABORTED,
								uri
							)
						}
						throw error
					})
					.finally(() => {
						this._abortControllers.delete(controller)
					})

				return new shaka.util.AbortableOperation(task, () => {
					canceled = true
					controller.abort()
					return Promise.resolve()
				})
			},
			100
		)
		this._schemeRegistered = true
	}

	/**
	 * 从自定义 scheme URI 中提取并解码片段文件名。
	 * @param uri Shaka 请求的片段 URI。
	 * @returns 片段文件名。
	 */
	private _getFilenameFromUri(uri: string) {
		const prefix = `${this._scheme}://`
		const withoutScheme = uri.startsWith(prefix) ? uri.slice(prefix.length) : uri
		const clean = withoutScheme.split(/[?#]/)[0] ?? ''

		try {
			return decodeURIComponent(clean)
		} catch {
			return clean
		}
	}

	/**
	 * 获取片段数据，并缓存已完成的解密结果。
	 * 不缓存进行中的请求: seek 时需要能中断单个请求, 共享的进行中 Promise 无法满足该需求。
	 * @param filename 片段文件名。
	 * @param signal 取消信号。
	 * @returns 片段二进制数据。
	 */
	private async _fetchCached(filename: string, signal: AbortSignal): Promise<ArrayBuffer> {
		const cached = this._lruCache.get(filename)
		if (cached) {
			// 命中后移到队尾, 维持 LRU 顺序
			this._lruCache.delete(filename)
			this._lruCache.set(filename, cached)
			return cached
		}

		const data = await this._fetchFragment(filename, signal)
		if (this._lruCache.size >= FragmentVideoPlayer.LRU_CACHE_MAX) {
			const oldest = this._lruCache.keys().next().value
			if (oldest) this._lruCache.delete(oldest)
		}

		this._lruCache.set(filename, data)
		return data
	}

	/**
	 * 通过片段签名地址或片段目录 URL 获取未加密片段。
	 * @param filename 片段文件名。
	 * @param signal 取消信号。
	 * @returns 片段二进制数据。
	 */
	private async _defaultFetch(filename: string, signal: AbortSignal): Promise<ArrayBuffer> {
		if (this._destroyed) {
			throw new DOMException('播放器已销毁', 'AbortError')
		}

		const folderUrl = this._folderUrl ? `${this._folderUrl}/${encodeURIComponent(filename)}` : ''
		const url = this._fragmentUrls.get(filename) ?? folderUrl
		if (!url) {
			throw new Error(`未找到片段访问地址: ${filename}`)
		}

		const response = await fetch(url, { signal })
		if (!response.ok) {
			throw new Error(`Failed to fetch fragment: ${url} (${response.status})`)
		}
		return response.arrayBuffer()
	}

	/**
	 * 获取片段目录中的 index.json。
	 * @param folderUrl 片段目录 URL。
	 * @returns 包含 indexList 的索引数据。
	 */
	static async fetchIndexJson(
		folderUrl: string,
		signal?: AbortSignal
	): Promise<{ indexList: string[]; [key: string]: any }> {
		const baseUrl = folderUrl.replace(/\/+$/, '')
		const response = await fetch(`${baseUrl}/index.json`, {
			signal
		})
		if (!response.ok) {
			throw new Error(`Failed to fetch index.json: ${response.status}`)
		}
		return response.json()
	}
}
