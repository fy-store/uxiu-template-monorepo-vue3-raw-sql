import { sys } from '@server/config'

/**
 * 获取web访问的URL
 * - 自动处理开发环境和生产环境
 * @param path 文件路径, 例如 /public/a.txt
 */
export function getWebURL(path: string = '') {
	const domain = sys.config.domain.endsWith('/') ? sys.config.domain.slice(0, -1) : sys.config.domain
	const port = sys.env === 'development' ? `:${sys.config.port}` : ''
	const _path = path.startsWith('/') ? path : `/${path}`.replaceAll('\\', '/').replaceAll('//', '/')
	return `${domain}${port}${_path}`
}
