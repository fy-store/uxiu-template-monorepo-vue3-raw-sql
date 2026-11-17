import type {
	CreateDirOptions,
	CreateDirSyncOptions,
	GetDirChildrenOptions,
	GetDirChildrenSyncOptions,
	MoveOptions,
	MoveSyncOptions,
	RenameOptions,
	RenameSyncOptions
} from './types'
import Path from 'node:path'
import fs from 'node:fs'
import stream from 'node:stream'
import { isObject, isString } from 'uxiu'
export type * from './types'

/** 文件管理器 */
export class FileManage {
	private validateReplaceOptions(options: MoveSyncOptions | RenameSyncOptions) {
		if (!isObject(options)) {
			throw new Error(`options: ${options} is not an object`)
		}
		if (options.replace !== undefined && typeof options.replace !== 'boolean') {
			throw new Error(`options.replace: ${options.replace} is not a boolean`)
		}
	}

	/**
	 * 判断文件或目录是否存在
	 * @param path 文件或目录路径
	 */
	isExitSync(path: string) {
		if (!isString(path)) {
			throw new Error(`path: ${path} is not a string`)
		}
		return fs.existsSync(path)
	}

	/**
	 * 判断文件或目录是否存在
	 * @param path 文件或目录路径
	 */
	async isExit(path: string) {
		if (!isString(path)) {
			throw new Error(`path: ${path} is not a string`)
		}
		try {
			await fs.promises.stat(path)
			return true
		} catch (error) {
			return false
		}
	}

	/**
	 * 判断文件是否存在
	 * @param path 文件路径
	 */
	isFileExistSync(path: string) {
		if (!isString(path)) {
			throw new Error(`path: ${path} is not a string`)
		}
		return this.isExitSync(path) && fs.statSync(path).isFile()
	}

	/**
	 * 判断文件是否存在
	 * @param path 文件路径
	 */
	async isFileExist(path: string) {
		if (!isString(path)) {
			throw new Error(`path: ${path} is not a string`)
		}
		try {
			const stat = await fs.promises.stat(path)
			return stat.isFile()
		} catch (error) {
			return false
		}
	}

	/**
	 * 判断目录是否存在
	 * @param path 目录路径
	 */
	isDirExistSync(path: string) {
		if (!isString(path)) {
			throw new Error(`path: ${path} is not a string`)
		}
		return this.isExitSync(path) && fs.statSync(path).isDirectory()
	}

	/**
	 * 判断目录是否存在
	 * @param path 目录路径
	 */
	async isDirExist(path: string) {
		if (!isString(path)) {
			throw new Error(`path: ${path} is not a string`)
		}
		try {
			const stat = await fs.promises.stat(path)
			return stat.isDirectory()
		} catch (error) {
			return false
		}
	}

	/**
	 * 读取指定路径的文件内容并以文本形式返回
	 * - 如果文件不存在将抛出异常
	 * @param path 文件路径
	 */
	readToTextSync(path: string) {
		if (!isString(path)) {
			throw new Error(`path: ${path} is not a string`)
		}
		if (!this.isFileExistSync(path)) {
			throw new Error(`path: ${path} file is not exist`)
		}
		return fs.readFileSync(path, 'utf-8')
	}

	/**
	 * 读取指定路径的文件内容并以文本形式返回
	 * - 如果文件不存在将抛出异常
	 * @param path 文件路径
	 * @returns 文件内容
	 */
	async readToText(path: string) {
		if (!isString(path)) {
			throw new Error(`path: ${path} is not a string`)
		}
		if (!(await this.isFileExist(path))) {
			throw new Error(`path: ${path} file is not exist`)
		}
		return await fs.promises.readFile(path, 'utf-8')
	}

	/**
	 * 将文本内容写入指定路径的文件
	 * - 如果文件不存在将创建新文件
	 * - 如果文件已存在将覆盖原有内容
	 * @param path 文件路径
	 * @param text 文本内容
	 */
	writeFileFromTextSync(path: string, text: string) {
		if (!isString(path)) {
			throw new Error(`path: ${path} is not a string`)
		}
		if (!isString(text)) {
			throw new Error(`text: ${text} is not a string`)
		}
		return fs.writeFileSync(path, text, 'utf-8')
	}

	/**
	 * 将文本内容写入指定路径的文件
	 * - 如果文件不存在将创建新文件
	 * - 如果文件已存在将覆盖原有内容
	 * @param path 文件路径
	 * @param text 文本内容
	 */
	async writeFileFromText(path: string, text: string) {
		if (!isString(path)) {
			throw new Error(`path: ${path} is not a string`)
		}
		if (!isString(text)) {
			throw new Error(`text: ${text} is not a string`)
		}
		return await fs.promises.writeFile(path, text, 'utf-8')
	}

	/**
	 * 获取指定目录下的所有文件列表(包括目录, 目录是一种特殊的文件)
	 * - 如果目录不存在将抛出异常
	 * - 如果配置选项 `recursive` 为 `true` 则递归获取子目录下的文件列表, 默认为 `false`
	 * @param dirPath 目录路径
	 * @param options 配置选项
	 */
	getDirChildrenSync(dirPath: string, options: GetDirChildrenSyncOptions = {}) {
		if (!isString(dirPath)) {
			throw new Error(`dirPath: ${dirPath} is not a string`)
		}
		if (!isObject(options)) {
			throw new Error(`options: ${options} is not an object`)
		}
		if (!this.isDirExistSync(dirPath)) {
			throw new Error(`dirPath: ${dirPath} directory is not exist`)
		}
		return fs.readdirSync(dirPath, { withFileTypes: true, recursive: options.recursive }).map((dirent) => {
			return {
				name: dirent.name,
				parentPath: dirent.parentPath.replaceAll('\\', '/'),
				isFile: dirent.isFile(),
				isDirectory: dirent.isDirectory()
			}
		})
	}

	/**
	 * 获取指定目录下的所有文件列表(包括目录, 目录是一种特殊的文件)
	 * - 如果目录不存在将抛出异常
	 * - 如果配置选项 `recursive` 为 `true` 则递归获取子目录下的文件列表, 默认为 `false`
	 * @param dirPath 目录路径
	 * @param options 配置选项
	 */
	async getDirChildren(dirPath: string, options: GetDirChildrenOptions = {}) {
		if (!isString(dirPath)) {
			throw new Error(`dirPath: ${dirPath} is not a string`)
		}
		if (!isObject(options)) {
			throw new Error(`options: ${options} is not an object`)
		}
		if (!(await this.isDirExist(dirPath))) {
			throw new Error(`dirPath: ${dirPath} directory is not exist`)
		}
		const dirents = await fs.promises.readdir(dirPath, { withFileTypes: true, recursive: options.recursive })
		return dirents.map((dirent) => {
			return {
				name: dirent.name,
				parentPath: dirent.parentPath.replaceAll('\\', '/'),
				isFile: dirent.isFile(),
				isDirectory: dirent.isDirectory()
			}
		})
	}

	/**
	 * 创建目录
	 * - 如果目录已存在则不进行任何操作
	 * - 如果父级目录不存在将抛出异常, 可通过配置选项启用递归创建目录功能
	 * @param parentPath 父级目录路径
	 * @param dirName 目录名称
	 * @param options 配置选项
	 */
	createDirSync(parentPath: string, dirName: string, options: CreateDirSyncOptions = {}) {
		if (!isString(parentPath)) {
			throw new Error(`parentPath: ${parentPath} is not a string`)
		}
		if (!isString(dirName)) {
			throw new Error(`dirName: ${dirName} is not a string`)
		}
		if (!isObject(options)) {
			throw new Error(`options: ${options} is not an object`)
		}
		if (this.isDirExistSync(Path.join(parentPath, dirName))) {
			return
		}
		return fs.mkdirSync(Path.join(parentPath, dirName), { recursive: options.recursive })
	}

	/**
	 * 创建目录
	 * - 如果目录已存在则不进行任何操作
	 * - 如果父级目录不存在将抛出异常, 可通过配置选项启用递归创建目录功能
	 * @param parentPath 父级目录路径
	 * @param dirName 目录名称
	 * @param options 配置选项
	 */
	async createDir(parentPath: string, dirName: string, options: CreateDirOptions = {}) {
		if (!isString(parentPath)) {
			throw new Error(`parentPath: ${parentPath} is not a string`)
		}
		if (!isString(dirName)) {
			throw new Error(`dirName: ${dirName} is not a string`)
		}
		if (!isObject(options)) {
			throw new Error(`options: ${options} is not an object`)
		}
		return fs.promises.mkdir(Path.join(parentPath, dirName), { recursive: options.recursive })
	}

	/**
	 * 同步移动文件或目录到指定的最终目标路径。
	 *
	 * 源路径必须存在；目标路径的父目录不存在时会自动递归创建。目标路径默认不允许已存在，
	 * 传入 `{ replace: true }` 时会先递归删除目标文件或目录，再移动源项。源和目标解析为同一路径时，
	 * 默认仍按目标已存在抛出异常；启用 `replace` 时不执行任何操作，避免误删源项。
	 *
	 * @param srcPath 源路径
	 * @param destPath 最终目标路径，而不是目标父目录
	 * @param options 冲突处理选项，`replace` 默认为 `false`
	 * @throws {Error} 参数类型错误、源路径不存在、目标已存在且未启用替换，或底层文件系统操作失败
	 */
	moveSync(srcPath: string, destPath: string, options: MoveSyncOptions = {}) {
		if (!isString(srcPath)) {
			throw new Error(`srcPath: ${srcPath} is not a string`)
		}
		if (!isString(destPath)) {
			throw new Error(`destPath: ${destPath} is not a string`)
		}
		this.validateReplaceOptions(options)
		if (!this.isExitSync(srcPath)) {
			throw new Error(`srcPath: ${srcPath} is not exist`)
		}
		if (this.isExitSync(destPath)) {
			if (!options.replace) {
				throw new Error(`destPath: ${destPath} is already exist`)
			}
			if (Path.relative(Path.resolve(srcPath), Path.resolve(destPath)) === '') {
				return
			}
			fs.rmSync(destPath, { force: true, recursive: true })
		}
		fs.mkdirSync(Path.dirname(destPath), { recursive: true })
		return fs.renameSync(srcPath, destPath)
	}

	/**
	 * 异步移动文件或目录到指定的最终目标路径。
	 *
	 * 行为与 `moveSync` 一致：自动递归创建目标父目录；默认拒绝覆盖已存在的目标；
	 * `{ replace: true }` 会先递归删除目标文件或目录。源和目标解析为同一路径时，启用替换将直接返回。
	 *
	 * @param srcPath 源路径
	 * @param destPath 最终目标路径，而不是目标父目录
	 * @param options 冲突处理选项，`replace` 默认为 `false`
	 * @throws {Error} 参数类型错误、源路径不存在、目标已存在且未启用替换，或底层文件系统操作失败
	 *
	 * @example
	 * ```ts
	 * await fileManage.move('/temp/avatar.png', '/storage/users/1/avatar.png')
	 * await fileManage.move('/temp/new-avatar.png', '/storage/users/1/avatar.png', { replace: true })
	 * ```
	 */
	async move(srcPath: string, destPath: string, options: MoveOptions = {}) {
		if (!isString(srcPath)) {
			throw new Error(`srcPath: ${srcPath} is not a string`)
		}
		if (!isString(destPath)) {
			throw new Error(`destPath: ${destPath} is not a string`)
		}
		this.validateReplaceOptions(options)
		if (!(await this.isExit(srcPath))) {
			throw new Error(`srcPath: ${srcPath} is not exist`)
		}
		if (await this.isExit(destPath)) {
			if (!options.replace) {
				throw new Error(`destPath: ${destPath} is already exist`)
			}
			if (Path.relative(Path.resolve(srcPath), Path.resolve(destPath)) === '') {
				return
			}
			await fs.promises.rm(destPath, { force: true, recursive: true })
		}
		await fs.promises.mkdir(Path.dirname(destPath), { recursive: true })
		return fs.promises.rename(srcPath, destPath)
	}

	/**
	 * 同步移动源目录的所有直接子项到目标目录。
	 *
	 * 目标目录不存在时会自动递归创建，已存在时保留目录本身。默认会在移动前检查全部同名目标，
	 * 任一冲突都会抛出异常且不会移动任何子项。传入 `{ replace: true }` 时，仅递归删除并替换目标目录内
	 * 与源子项同名的文件或目录，不会清空或删除目标目录中的其他内容。
	 *
	 * @param srcPath 源目录路径
	 * @param destPath 目标目录路径
	 * @param options 子项冲突处理选项，`replace` 默认为 `false`
	 * @throws {Error} 参数类型错误、源目录不存在、存在同名目标且未启用替换，或底层文件系统操作失败
	 */
	moveChildrenSync(srcPath: string, destPath: string, options: MoveSyncOptions = {}) {
		if (!isString(srcPath)) {
			throw new Error(`srcPath: ${srcPath} is not a string`)
		}
		if (!isString(destPath)) {
			throw new Error(`destPath: ${destPath} is not a string`)
		}
		this.validateReplaceOptions(options)
		if (!this.isExitSync(srcPath)) {
			throw new Error(`srcPath: ${srcPath} is not exist`)
		}
		const children = this.getDirChildrenSync(srcPath)
		fs.mkdirSync(destPath, { recursive: true })
		if (!options.replace) {
			const conflict = children.find((it) => this.isExitSync(Path.join(destPath, it.name)))
			if (conflict) {
				throw new Error(`destPath: ${Path.join(destPath, conflict.name)} is already exist`)
			}
		}
		return children.map((it) => {
			return this.moveSync(Path.join(it.parentPath, it.name), Path.join(destPath, it.name), options)
		})
	}

	/**
	 * 异步移动源目录的所有直接子项到目标目录。
	 *
	 * 行为与 `moveChildrenSync` 一致：保留目标目录及其中不冲突的内容；默认先检查全部同名目标，
	 * 再并发移动子项；`{ replace: true }` 只替换目标目录内的同名子项。
	 *
	 * @param srcPath 源目录路径
	 * @param destPath 目标目录路径
	 * @param options 子项冲突处理选项，`replace` 默认为 `false`
	 * @throws {Error} 参数类型错误、源目录不存在、存在同名目标且未启用替换，或底层文件系统操作失败
	 *
	 * @example
	 * ```ts
	 * await fileManage.moveChildren('/build/server', '/dist')
	 * await fileManage.moveChildren('/build/public', '/dist/public', { replace: true })
	 * ```
	 */
	async moveChildren(srcPath: string, destPath: string, options: MoveOptions = {}) {
		if (!isString(srcPath)) {
			throw new Error(`srcPath: ${srcPath} is not a string`)
		}
		if (!isString(destPath)) {
			throw new Error(`destPath: ${destPath} is not a string`)
		}
		this.validateReplaceOptions(options)
		if (!(await this.isExit(srcPath))) {
			throw new Error(`srcPath: ${srcPath} is not exist`)
		}
		const children = await this.getDirChildren(srcPath)
		await fs.promises.mkdir(destPath, { recursive: true })
		if (!options.replace) {
			const conflictResults = await Promise.all(
				children.map(async (it) => ({ it, exists: await this.isExit(Path.join(destPath, it.name)) }))
			)
			const conflict = conflictResults.find(({ exists }) => exists)
			if (conflict) {
				throw new Error(`destPath: ${Path.join(destPath, conflict.it.name)} is already exist`)
			}
		}
		return await Promise.all(
			children.map((it) => {
				return this.move(Path.join(it.parentPath, it.name), Path.join(destPath, it.name), options)
			})
		)
	}

	/**
	 * 删除文件或目录
	 * - 如果路径不存在将抛出异常
	 * - 如果路径是目录则递归删除目录下的所有内容
	 * @param path 文件或目录路径
	 */
	removeSync(path: string) {
		if (!isString(path)) {
			throw new Error(`path: ${path} is not a string`)
		}
		if (!this.isExitSync(path)) {
			throw new Error(`path: ${path} is not exist`)
		}
		return fs.rmSync(path, { force: true, recursive: true })
	}

	/**
	 * 删除文件或目录
	 * - 如果路径不存在将抛出异常
	 * - 如果路径是目录则递归删除目录下的所有内容
	 * @param path 文件或目录路径
	 */
	async remove(path: string) {
		if (!isString(path)) {
			throw new Error(`path: ${path} is not a string`)
		}
		if (!(await this.isExit(path))) {
			throw new Error(`path: ${path} is not exist`)
		}
		return fs.promises.rm(path, { force: true, recursive: true })
	}

	/**
	 * 同步重命名文件或目录。
	 *
	 * 新路径由源路径的父目录与 `newName` 组合得到。默认情况下同名目标已存在会抛出异常；
	 * 传入 `{ replace: true }` 时会先递归删除同名目标。新路径与源路径相同时，启用替换将直接返回，
	 * 避免删除正在重命名的源项。
	 *
	 * @param path 文件或目录路径
	 * @param newName 新名字
	 * @param options 冲突处理选项，`replace` 默认为 `false`
	 * @throws {Error} 参数类型错误、源路径不存在、同名目标已存在且未启用替换，或底层文件系统操作失败
	 */
	renameSync(path: string, newName: string, options: RenameSyncOptions = {}) {
		if (!isString(path)) {
			throw new Error(`path: ${path} is not a string`)
		}
		if (!isString(newName)) {
			throw new Error(`newName: ${newName} is not a string`)
		}
		this.validateReplaceOptions(options)
		if (!this.isExitSync(path)) {
			throw new Error(`path: ${path} is not exist`)
		}
		const newPath = Path.join(Path.dirname(path), newName)
		if (this.isExitSync(newPath)) {
			if (!options.replace) {
				throw new Error(`newName: ${newName} is already exist`)
			}
			if (Path.relative(Path.resolve(path), Path.resolve(newPath)) === '') {
				return
			}
			fs.rmSync(newPath, { force: true, recursive: true })
		}
		return fs.renameSync(path, newPath)
	}

	/**
	 * 异步重命名文件或目录。
	 *
	 * 行为与 `renameSync` 一致：默认拒绝替换同名目标；`{ replace: true }` 会先递归删除同名目标；
	 * 新路径与源路径相同时，启用替换将直接返回。
	 *
	 * @param path 文件或目录路径
	 * @param newName 新名字
	 * @param options 冲突处理选项，`replace` 默认为 `false`
	 * @throws {Error} 参数类型错误、源路径不存在、同名目标已存在且未启用替换，或底层文件系统操作失败
	 *
	 * @example
	 * ```ts
	 * await fileManage.rename('/storage/draft.txt', 'final.txt')
	 * await fileManage.rename('/storage/new-final.txt', 'final.txt', { replace: true })
	 * ```
	 */
	async rename(path: string, newName: string, options: RenameOptions = {}) {
		if (!isString(path)) {
			throw new Error(`path: ${path} is not a string`)
		}
		if (!isString(newName)) {
			throw new Error(`newName: ${newName} is not a string`)
		}
		this.validateReplaceOptions(options)
		if (!(await this.isExit(path))) {
			throw new Error(`path: ${path} is not exist`)
		}
		const newPath = Path.join(Path.dirname(path), newName)
		if (await this.isExit(newPath)) {
			if (!options.replace) {
				throw new Error(`newName: ${newName} is already exist`)
			}
			if (Path.relative(Path.resolve(path), Path.resolve(newPath)) === '') {
				return
			}
			await fs.promises.rm(newPath, { force: true, recursive: true })
		}
		return fs.promises.rename(path, newPath)
	}

	/**
	 * 从流管道读取数据并写入到另一个流
	 * @param readStream 读取流
	 * @param writeStream 写入流
	 */
	async rwPipeFromStream(readStream: NodeJS.ReadableStream, writeStream: NodeJS.WritableStream) {
		try {
			await stream.promises.pipeline(readStream, writeStream)
		} catch (error) {
			writeStream.end()
			if (readStream instanceof stream.Readable) {
				readStream.destroy()
			}
			throw error
		}
	}

	/**
	 * 从文件路径读取数据并写入到另一个文件路径
	 * - 通过流的方式进行读取和写入, 适用于大文件的处理
	 * @param path 源文件路径
	 * @param target 目标文件路径
	 */
	async rwPipeFromPath(path: string, target: string) {
		if (!isString(path)) {
			throw new Error(`path: ${path} is not a string`)
		}
		if (!isString(target)) {
			throw new Error(`target: ${target} is not a string`)
		}
		if (!this.isExitSync(path)) {
			throw new Error(`path: ${path} is not exist`)
		}
		const readStream = fs.createReadStream(path)
		const writeStream = fs.createWriteStream(target)
		return this.rwPipeFromStream(readStream, writeStream)
	}

	/**
	 * 从文件路径列表读取数据并按照顺序写入到另一个文件路径
	 * - 通过流的方式进行读取和写入, 适用于大文件的处理
	 * @param chunkPaths 源文件路径列表
	 * @param target 目标文件路径
	 */
	async rwPipeFromPathList(chunkPaths: string[], target: string) {
		if (!Array.isArray(chunkPaths)) {
			throw new Error(`pathList: ${chunkPaths} is not an array`)
		}
		if (chunkPaths.length === 0) {
			throw new Error('pathList is empty')
		}
		if (!isString(target)) {
			throw new Error(`target: ${target} is not a string`)
		}
		const result = await Promise.all(chunkPaths.map((path) => this.isExit(path)))
		if (!result.every((exist) => exist)) {
			throw new Error(`path: ${chunkPaths} is not exist`)
		}
		const readList: fs.ReadStream[] = []
		const writeStream = fs.createWriteStream(target, { flags: 'a' })
		try {
			for (const chunkPath of chunkPaths) {
				const read = fs.createReadStream(chunkPath)
				readList.push(read)
				await stream.promises.pipeline(read, writeStream, {
					end: false
				})
			}
		} catch (error) {
			for (const read of readList) {
				if (read instanceof stream.Readable) {
					read.destroy()
				}
			}
			throw error
		} finally {
			writeStream.end()
		}
	}
}
