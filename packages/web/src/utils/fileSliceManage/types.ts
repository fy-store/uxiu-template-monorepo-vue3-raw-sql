import type { FFmpeg } from '@ffmpeg/ffmpeg'

// #region Worker 消息类型
export interface FileSliceManageWorkerBlobHashMessage {
	type: 'blobHash'
	payload: {
		/** 切片索引 */
		index: number
		/** 切片 hash 值 */
		hash: string
		/** 切片数据 */
		blob: Blob
	}
}

export interface FileSliceManageWorkerEncriptBlobMessage {
	type: 'encriptBlob'
	payload: {
		/** 切片索引 */
		index: number
		/** 切片加密后数据 */
		encriptBuffer: ArrayBuffer
		/** 原始 blob 数据 */
		originBlob: Blob
	}
}

/** worker 消息类型 */
export type FileSliceManageWorkerMessage =
	| FileSliceManageWorkerBlobHashMessage
	| FileSliceManageWorkerEncriptBlobMessage
// #endregion

// #region 发送给 worker 的消息类型
export interface FileSliceManagePostBlobHashMessageToWorker {
	type: 'computeHash'
	payload: {
		/** 切片索引 */
		index: number
		/** 切片数据 */
		blob: Blob
	}
}

export interface FileSliceManagePostEncriptBlobMessageToWorker {
	type: 'encriptBlob'
	payload: {
		/** 切片索引 */
		index: number
		/** 切片数据 */
		blob: Blob
		/** 密码 */
		key: string
	}
}

/** 发送给 worker 的消息类型 */
export type PostMessageToWorker =
	| FileSliceManagePostBlobHashMessageToWorker
	| FileSliceManagePostEncriptBlobMessageToWorker
// #endregion

export interface FileSliceManageComputeFileHashOptions {
	/**
	 * 每个分片的大小, 默认 5MB
	 */
	chunkSize?: number
}

export interface FileSliceManageComputeFileHashInfo {
	/** 切片索引 */
	index: number
	/** 切片 hash 值 */
	hash: string
	/** 切片数据 */
	blob: Blob
}

export interface FileSliceManageComputeFileHashResult {
	/** 切片信息列表 */
	hashInfoList: FileSliceManageComputeFileHashInfo[]
	/** 所有切片的 hash 按 `-` 拼接后再次 hash 的值 */
	fileHash: string
}

export interface FileSliceManageMp4ToDashFmp4ProgressInfo {
	ratio: number
	time: number
}

export interface FileSliceManageMp4ToDashFmp4Options {
	/**
	 * 每个 fMP4 片段时长, 单位秒, 默认 5 秒
	 */
	segmentDuration?: number
	/**
	 * ffmpeg 加载参数
	 */
	loadConfig?: Parameters<FFmpeg['load']>[0]
	/**
	 * 转换进度回调
	 */
	onProgress?: (info: FileSliceManageMp4ToDashFmp4ProgressInfo) => void
	/**
	 * ffmpeg 日志回调
	 */
	onLog?: (message: string) => void
}

export interface FileSliceManageDashFmp4File {
	/** 后端片段索引名, 只使用字母、数字和连字符 */
	name: string
	/** 文件内容 */
	buffer: ArrayBuffer
	/** 文件 Blob */
	blob: Blob
	/** 文件类型 */
	type: 'manifest' | 'init' | 'segment'
}

export interface FileSliceManageMp4ToDashFmp4Result {
	/** 加密上传后用于读取 MPD 的片段索引 */
	manifestName: string
	/** 原始 MPD 文本 */
	manifestText: string
	/** 需要上传的全部文件, 包含 manifest */
	files: FileSliceManageDashFmp4File[]
	/** 真实媒体文件, 不包含 manifest */
	mediaFiles: FileSliceManageDashFmp4File[]
}

export interface FileSliceManageEncriptSliceFromFileCallbackInfo {
	/** 切片索引 */
	index: number
	/** 切片原始数据 */
	originBlob: Blob
	/** 切片加密后数据 */
	encriptBuffer: ArrayBuffer
}

export interface FileSliceManageEncriptSliceFromFileCallback {
	/**
	 * @param info 切片加密回调信息
	 * @param next 处理下一个切片的回调, 需要调用该回调才能继续处理下一个切片
	 */
	(info: FileSliceManageEncriptSliceFromFileCallbackInfo, next: () => void): void
}

export interface FileSliceManageEncriptFileOptions {
	/**
	 * 每个分片的大小, 默认 5MB
	 */
	chunkSize?: number
}

export interface FileSliceManageVideoInfo {
	/** 视频总时长, 单位: 秒 */
	duration: number
	/** 视频宽度 */
	width: number
	/** 视频高度 */
	height: number
}

export interface VideoManifest {
	version: number
	/** 加密片段存储中 MPD 文件的索引名 */
	manifestIndex?: string
	duration: number
	segmentCount: number
	width: number
	height: number
	hasVideo: boolean
	hasAudio: boolean
}
