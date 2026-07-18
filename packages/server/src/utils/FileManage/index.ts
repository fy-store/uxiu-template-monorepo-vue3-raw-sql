import type { CreateDirOptions, CreateDirSyncOptions, GetDirChildrenOptions, GetDirChildrenSyncOptions } from './types'
import Path from 'node:path'
import fs from 'node:fs'
import stream from 'node:stream'
import { isObject, isString } from 'uxiu'

/** 文件管理器 */
export class FileManage {
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
	 * 移动文件或目录
	 * - 如果源路径不存在将抛出异常
	 * - 如果目标路径已存在将抛出异常
	 * @param srcPath 源路径
	 * @param destPath 目标路径
	 */
	moveSync(srcPath: string, destPath: string) {
		if (!isString(srcPath)) {
			throw new Error(`srcPath: ${srcPath} is not a string`)
		}
		if (!isString(destPath)) {
			throw new Error(`destPath: ${destPath} is not a string`)
		}
		if (!this.isExitSync(srcPath)) {
			throw new Error(`srcPath: ${srcPath} is not exist`)
		}
		if (this.isDirExistSync(srcPath)) {
			if (this.isDirExistSync(destPath)) {
				throw new Error(`destPath: ${destPath} is already exist`)
			}
		} else {
			if (this.isFileExistSync(destPath)) {
				throw new Error(`destPath: ${destPath} is already exist`)
			}
		}
		return fs.renameSync(srcPath, destPath)
	}

	/**
	 * 移动文件或目录
	 * - 如果源路径不存在将抛出异常
	 * - 如果目标路径已存在将抛出异常
	 * @param srcPath 源路径
	 * @param destPath 目标路径
	 */
	async move(srcPath: string, destPath: string) {
		if (!isString(srcPath)) {
			throw new Error(`srcPath: ${srcPath} is not a string`)
		}
		if (!isString(destPath)) {
			throw new Error(`destPath: ${destPath} is not a string`)
		}
		if (!(await this.isExit(srcPath))) {
			throw new Error(`srcPath: ${srcPath} is not exist`)
		}
		if (await this.isDirExist(srcPath)) {
			if (await this.isDirExist(destPath)) {
				throw new Error(`destPath: ${destPath} is already exist`)
			}
		} else {
			if (await this.isFileExist(destPath)) {
				throw new Error(`destPath: ${destPath} is already exist`)
			}
		}
		return fs.promises.rename(srcPath, destPath)
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
	 * 重命名文件或目录名字
	 * - 如果路径不存在将抛出异常
	 * - 如果新名字已存在将抛出异常
	 * @param path 文件或目录路径
	 * @param newName 新名字
	 */
	renameSync(path: string, newName: string) {
		if (!isString(path)) {
			throw new Error(`path: ${path} is not a string`)
		}
		if (!isString(newName)) {
			throw new Error(`newName: ${newName} is not a string`)
		}
		if (!this.isExitSync(path)) {
			throw new Error(`path: ${path} is not exist`)
		}
		const newPath = Path.join(Path.dirname(path), newName)
		if (this.isExitSync(newPath)) {
			throw new Error(`newName: ${newName} is already exist`)
		}
		return fs.renameSync(path, newPath)
	}

	/**
	 * 重命名文件或目录名字
	 * - 如果路径不存在将抛出异常
	 * - 如果新名字已存在将抛出异常
	 * @param path 文件或目录路径
	 * @param newName 新名字
	 */
	async rename(path: string, newName: string) {
		if (!isString(path)) {
			throw new Error(`path: ${path} is not a string`)
		}
		if (!isString(newName)) {
			throw new Error(`newName: ${newName} is not a string`)
		}
		if (!(await this.isExit(path))) {
			throw new Error(`path: ${path} is not exist`)
		}
		const newPath = Path.join(Path.dirname(path), newName)
		if (await this.isExit(newPath)) {
			throw new Error(`newName: ${newName} is already exist`)
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
