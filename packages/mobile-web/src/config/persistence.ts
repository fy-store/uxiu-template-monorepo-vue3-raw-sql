/**
 * 系统持久化键名。
 * - 所有 localStorage、sessionStorage 等持久化键必须在此统一声明。
 * - 新增键名需要使用项目命名空间，避免与同域其他系统冲突。
 */
export const persistenceKeys = {
	TOKEN: 'sys:auth:token',
	USER_INFO: 'sys:auth:user-info',
	PREVIEW_FILE_DOWNLOAD_MODE: 'sys:preview-file:download-mode'
} as const
