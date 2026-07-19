export type DownloadTaskStatus = 'idle' | 'running' | 'paused'

export type DownloadTaskSource =
	| {
			type: 'url'
			url: string
	  }
	| {
			type: 'fragments'
			folderUrl: string
	  }

export interface DownloadTaskOptions {
	source: DownloadTaskSource
	filename: string
	mimeType?: string
	password?: string
	manifestIndex?: string
	directoryHandle?: FileSystemDirectoryHandle
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
