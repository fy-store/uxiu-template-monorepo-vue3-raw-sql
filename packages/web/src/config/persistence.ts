/**
 * 系统持久化键名。
 * - 所有 localStorage、sessionStorage 等持久化键必须在此统一声明。
 * - 新增键名需要使用项目命名空间，避免与同域其他系统冲突。
 */
export const persistenceKeys = {
	token: 'sys:auth:token',
	userInfo: 'sys:auth:user-info',
	previewFileDownloadMode: 'sys:preview-file:download-mode'
} as const
