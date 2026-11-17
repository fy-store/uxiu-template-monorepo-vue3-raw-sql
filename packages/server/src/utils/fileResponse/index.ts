export type FileDisposition = 'attachment' | 'inline'

/**
 * 获取查询参数中的第一个字符串值。
 * @param value 查询参数值。
 * @returns 字符串参数值。
 */
export function getFileQueryValue(value: unknown) {
	if (Array.isArray(value)) {
		return String(value[0] ?? '')
	}
	return typeof value === 'string' ? value : ''
}

/**
 * 将 download 查询参数转换为 Content-Disposition 类型。
 * - attachment: 下载文件。
 * - inline: 浏览器内预览文件。
 * - 兼容旧链接：任意其他非空值仍按 attachment 处理。
 * @param value download 查询参数。
 * @returns Content-Disposition 类型。
 */
export function getFileDisposition(value: unknown): FileDisposition {
	const download = getFileQueryValue(value)
	if (download === 'inline') return 'inline'
	if (download === 'attachment') return 'attachment'
	return download ? 'attachment' : 'inline'
}
