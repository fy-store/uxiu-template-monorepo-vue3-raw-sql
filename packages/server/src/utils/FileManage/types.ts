export interface GetDirChildrenSyncOptions {
	/** 是否递归获取子目录下的文件列表, 默认为 `false` */
	recursive?: boolean
}

export interface GetDirChildrenOptions extends GetDirChildrenSyncOptions {}

export interface CreateDirSyncOptions {
	/** 是否递归创建目录, 默认为 `false` */
	recursive?: boolean
}

export interface CreateDirOptions extends CreateDirSyncOptions {}
