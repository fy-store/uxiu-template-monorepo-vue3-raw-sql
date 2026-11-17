import type { FileFragmentAccessItem } from '@server/api/v1/fileInfo'

export type DownloadTaskStatus = 'idle' | 'running' | 'paused'

export type DownloadTaskSource =
	| {
			type: 'url'
			url: string
	  }
	| {
			type: 'fragments'
			folderUrl: string
			/** 片段访问列表, 顺序与片段清单一致; 传入后片段直连 OSS */
			fragments?: FileFragmentAccessItem[]
	  }

export interface DownloadTaskOptions {
	source: DownloadTaskSource
	filename: string
	mimeType?: string
	password?: string
	manifestIndex?: string
	directoryHandle?: FileSystemDirectoryHandle
	/** fetch 请求凭证模式，默认 same-origin */
	credentials?: RequestCredentials
}

export interface DownloadTaskProgress {
	percentage: number
	loaded: number
	total: number
}

export interface DownloadTaskResult {
	buffer?: ArrayBuffer
	mimeType: string
}

export type DownloadWorkerRequest =
	| {
			type: 'start'
			options: DownloadTaskOptions
	  }
	| {
			type: 'pause' | 'resume' | 'cancel'
	  }

export type DownloadWorkerResponse =
	| {
			type: 'progress'
			progress: DownloadTaskProgress
	  }
	| {
			type: 'complete'
			result: DownloadTaskResult
	  }
	| {
			type: 'canceled'
	  }
	| {
			type: 'error'
			error: string
	  }
