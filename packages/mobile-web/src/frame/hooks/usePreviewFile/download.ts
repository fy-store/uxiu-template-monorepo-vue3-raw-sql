import { selectDir } from '@/utils'

/**
 * 判断错误是否由用户取消目录选择引起。
 * @param error 待判断的错误。
 * @returns 是否为用户取消操作。
 */
export function isAbortError(error: unknown) {
	return error instanceof DOMException && error.name === 'AbortError'
}

/**
 * 获取用于下载的安全文件名。
 * @param name 原始文件名。
 * @returns 移除文件系统非法字符后的文件名。
 */
export function getSafeDownloadName(name: string) {
	return name.replace(/[\\/:*?"<>|]/g, '_') || 'download'
}

/**
 * 为同源文件 URL 添加下载文件名和响应方式参数。
 * 跨域 URL（如 OSS 预签名链接）原样返回，避免追加参数破坏签名。
 * @param url 文件 URL。
 * @param name 下载文件名。
 * @param disposition Content-Disposition 类型。
 * @returns 带下载参数的 URL，或跨域时的原始 URL。
 */
export function getFileRequestUrl(url: string, name: string, disposition: 'attachment' | 'inline') {
	const target = new URL(url, window.location.href)
	// 跨域地址（如 OSS 预签名链接）不追加参数：V4 签名覆盖全部查询参数，追加后会导致签名校验失败
	if (target.origin !== window.location.origin) return url
	target.searchParams.set('name', name)
	target.searchParams.set('download', disposition)
	return target.toString()
}

/**
 * 使用 a 元素触发浏览器普通下载。
 * @param url 下载 URL。
 * @param name 下载文件名。
 * @param revoke 下载后是否释放 Blob URL。
 */
export function downloadByAnchor(url: string, name: string, revoke = false) {
	const anchor = document.createElement('a')
	anchor.href = url
	anchor.download = getSafeDownloadName(name)
	anchor.click()

	if (revoke) {
		setTimeout(() => URL.revokeObjectURL(url))
	}
}

/**
 * 选择用于保存下载文件的目录。
 * @returns 用户选择的可写目录句柄。
 */
export function selectDownloadDir() {
	return selectDir({
		id: 'preview-file-download',
		mode: 'readwrite'
	})
}
