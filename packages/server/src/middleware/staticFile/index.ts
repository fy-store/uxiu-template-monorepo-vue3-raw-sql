import type { Context, Next } from 'koa'
import path from 'node:path/posix'
import { send } from '@koa/send'
import mime from 'mime'
import { getFileDisposition, getFileQueryValue } from '@server/utils'

export interface StaticFileOptions {
	startPath?: string
	publicPath: string
}

/** 访问公共文件 */
export function staticFile(options: StaticFileOptions) {
	let { startPath = '/', publicPath } = options ?? {}
	if (!publicPath) {
		throw new Error('middleware -> staticFile: publicPath is required !')
	}
	startPath = path.join('/', startPath).replaceAll('\\', '/')
	publicPath = path.join('/', publicPath).replaceAll('\\', '/')
	return async (ctx: Context, next: Next) => {
		if (!['GET', 'POST'].includes(ctx.method.toUpperCase())) {
			await next()
			return
		}

		// 不访问公共文件目录，放行
		if (!ctx.path.replaceAll('\\', '/').startsWith(startPath)) {
			await next()
			return
		}

		let name = getFileQueryValue(ctx.query.name)
		if (name && path.extname(name) === '') {
			name += path.extname(ctx.path)
		}
		const disposition = getFileDisposition(ctx.query.download)
		ctx.attachment(name || void 0, { type: disposition })
		try {
			const filePath =
				ctx.path === '/'
					? path.join(publicPath, '/index.html')
					: path.join(publicPath, ctx.path.replace(startPath, '')) // 只替换一次，避免替换多个路径
			await send(ctx, filePath, {
				maxage: 0,
				immutable: true,
				setHeaders(res) {
					const type = mime.getType(filePath)
					if (type) {
						res.setHeader('Content-Type', type)
					}
					res.setHeader('Accept-Ranges', 'bytes')
				}
			})
		} catch (error) {
			ctx.attachment(name || void 0, { type: disposition })
			ctx.status = 404
			ctx.body = {
				code: 404,
				msg: '资源未找到'
			}
		}
	}
}