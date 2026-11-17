import type { Context, Next } from 'koa'
import path from 'node:path'
import { send } from '@koa/send'
import mime from 'mime'
import { getFileDisposition, getFileQueryValue } from '@server/utils'

export interface StaticFileOptions {
	/** 访问路径前缀, 默认 `/` 只有以此开头的路径才会被处理 */
	startPath?: string
	/** 公共文件目录, 请传递 `/路径`, 不要使用 `file:` 路径 */
	publicPath: string
	/** 自定义是否处理, 默认 true, 返回 `false` 将跳过不进行处理 */
	isHandle?: (ctx: Context) => boolean | Promise<boolean>
	/** 自定义重定向路径, 不进行处理请返回 `filePath` */
	redirect?: (ctx: Context, filePath: string) => string | Promise<string>
	/**
	 * 自定义错误处理
	 * @param ctx 上下文
	 * @param error 错误
	 * @param defaultErrorHandle 默认错误处理函数, 可调用默认错误处理函数
	 */
	errorHandle?: (ctx: Context, error: any, defaultErrorHandle: () => void) => void | Promise<void>
	/** 自定义 send 选项, 默认值请参考 `@koa/send`, 当前组件默认覆盖了 `setHeaders` 选项以用于更合理的生成响应头 */
	sendOptions?: Parameters<typeof send>[2]
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
		if (options.isHandle) {
			const isContinue = await options.isHandle(ctx)
			if (!isContinue) {
				await next()
				return
			}
		}

		if (!['GET', 'POST'].includes(ctx.method.toUpperCase())) {
			await next()
			return
		}

		// 不访问公共文件目录，放行
		if (!ctx.path.startsWith(startPath)) {
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
			let filePath =
				ctx.path === '/' ? path.join(publicPath, '/index.html') : path.join(publicPath, ctx.path.replace(startPath, '')) // 只替换一次，避免替换多个路径
			if (options.redirect) {
				filePath = await options.redirect(ctx, filePath)
			}

			await send(ctx, filePath, {
				setHeaders(res) {
					const type = mime.getType(filePath)
					if (type) {
						res.setHeader('Content-Type', type)
					}
					res.setHeader('Accept-Ranges', 'bytes')
				}
			})
		} catch (error) {
			const defaultErrorHandle = () => {
				ctx.attachment(name || void 0, { type: disposition })
				ctx.status = 404
				ctx.body = {
					code: 404,
					msg: '资源未找到'
				}
			}
			if (options.errorHandle) {
				await options.errorHandle(ctx, error, defaultErrorHandle)
			} else {
				defaultErrorHandle()
			}
		}
	}
}
