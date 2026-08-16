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

/** `moveSync` 与 `moveChildrenSync` 的配置选项。 */
export interface MoveSyncOptions {
	/**
	 * 是否替换已存在的目标，默认为 `false`。
	 *
	 * - `false`：目标存在时抛出异常，不修改源和目标。
	 * - `true`：移动前递归删除目标文件或目录。删除不可恢复，请确保目标路径可信。
	 *
	 * 对 `moveChildrenSync`，该选项只作用于目标目录中的同名子项，不会删除目标目录本身。
	 */
	replace?: boolean
}

/** `move` 与 `moveChildren` 的配置选项。 */
export interface MoveOptions extends MoveSyncOptions {}

/** `renameSync` 的配置选项。 */
export interface RenameSyncOptions {
	/**
	 * 是否替换新名字对应的已有目标，默认为 `false`。
	 *
	 * - `false`：同名目标存在时抛出异常，不修改源和目标。
	 * - `true`：重命名前递归删除同名目标文件或目录。删除不可恢复，请确保新名字可信。
	 */
	replace?: boolean
}

/** `rename` 的配置选项。 */
export interface RenameOptions extends RenameSyncOptions {}
