import type { FileStorageInfo, FileStorageOptions, SliceFileStorageInfo } from './types'
import { isArray, isObject, isString } from 'uxiu'
import { FileManage } from '@server/utils'
import { ComputeHash } from '@common/computeHash'
import Path from 'node:path'

export type * from './types'
export const storageName = Object.freeze({
	/** 公共存储名称 */
	PUBLIC_STORAGE_NAME: 'public',
	/** 私有存储名称 */
	PRIVATE_STORAGE_NAME: 'private',
	/** 删除存储名称 */
	DELETE_STORAGE_NAME: 'delete',
	/** 切片存储名称 */
	SLICE_STORAGE_NAME: 'slice',
	/** 片段存储配置清单或分片任务配置清单的文件名称 */
	INDEX_CONTENT_NAME: 'index.json'
})

/** 文件存储器 */
export class FileStorage {
	private _storagePath: string
	private _fm = new FileManage()
	private _computeHash: ComputeHash
	private _publicStoragePath: string
	private _privateStoragePath: string
	private _deleteStoragePath: string
	private _sliceStoragePath: string

	/** 存储区根目录路径 */
	get storagePath() {
		return this._storagePath
	}

	/** 公共存储区路径 */
	get publicStoragePath() {
		return this._publicStoragePath
	}

	/** 私有存储区路径 */
	get privateStoragePath() {
		return this._privateStoragePath
	}

	/** 删除存储区路径 */
	get deleteStoragePath() {
		return this._deleteStoragePath
	}

	/** 切片存储区路径 */
	get sliceStoragePath() {
		return this._sliceStoragePath
	}

	/** 文件管理工具实例 */
	get fm() {
		return this._fm
	}

	/** 哈希计算工具实例 */
	get ch() {
		return this._computeHash
	}

	/** 存储命名常量 */
	get storageName() {
		return storageName
	}

	/**
	 * 文件存储器
	 * @param options 配置选项
	 */
	constructor(options: FileStorageOptions) {
		if (!isObject(options)) {
			throw new TypeError('FileStorage options must be an object')
		}
		if (!isString(options.storagePath)) {
			throw new TypeError('FileStorage options.storagePath must be a string')
		}
		if (!isString(options.storagePath)) {
			throw new TypeError('FileStorage options.storagePath must be a string')
		}

		this._computeHash = new ComputeHash(options.computeHashOptions)
		this._storagePath = this.pathDelimiterToUnix(options.storagePath)
		this._publicStoragePath = this.pathJoin(this._storagePath, storageName.PUBLIC_STORAGE_NAME)
		this._privateStoragePath = this.pathJoin(this._storagePath, storageName.PRIVATE_STORAGE_NAME)
		this._deleteStoragePath = this.pathJoin(this._storagePath, storageName.DELETE_STORAGE_NAME)
		this._sliceStoragePath = this.pathJoin(this._storagePath, storageName.SLICE_STORAGE_NAME)
		this._initStorage()
	}

	/**
	 * 将文件移动到公共存储区
	 * - 移入的文件将被重命名为一个唯一的文件名以避免冲突
	 * - 移入的文件将被保存在公共存储区的根目录下，不会保留原始路径结构
	 * @param srcPath 待移动文件的路径
	 * @returns 该文件在公共存储区中的信息
	 * @throws {Error} 当源文件不存在或移动失败时抛出错误
	 */
	async moveFileToPublicStorage(srcPath: string): Promise<FileStorageInfo> {
		if (!isString(srcPath)) {
			throw new TypeError('srcPath must be a string')
		}
		if (!(await this._fm.isFileExist(srcPath))) {
			throw new Error(`srcPath file does not exist: ${srcPath}`)
		}
		const filename = await this.createUniqueFilename(this._publicStoragePath, Path.extname(srcPath))
		const absoluteStoragePath = this.pathJoin(this._publicStoragePath, filename)
		await this._fm.move(srcPath, absoluteStoragePath)
		return {
			parentPath: this._publicStoragePath,
			name: filename,
			relativeStoragePath: this.pathJoin(storageName.PUBLIC_STORAGE_NAME, filename),
			absoluteStoragePath
		}
	}

	/**
	 * 将文件移动到私有存储区
	 * - 移入的文件将被重命名为一个唯一的文件名以避免冲突
	 * - 移入的文件将被保存在私有存储区的根目录下，不会保留原始路径结构
	 * @param srcPath 待移动文件的路径
	 * @returns 该文件在私有存储区中的信息
	 * @throws {Error} 当源文件不存在或移动失败时抛出错误
	 */
	async moveFileToPrivateStorage(srcPath: string): Promise<FileStorageInfo> {
		if (!isString(srcPath)) {
			throw new TypeError('srcPath must be a string')
		}
		if (!(await this._fm.isFileExist(srcPath))) {
			throw new Error(`srcPath file does not exist: ${srcPath}`)
		}
		const filename = await this.createUniqueFilename(this._privateStoragePath, Path.extname(srcPath))
		const absoluteStoragePath = this.pathJoin(this._privateStoragePath, filename)
		await this._fm.move(srcPath, absoluteStoragePath)
		return {
			parentPath: this._privateStoragePath,
			name: filename,
			relativeStoragePath: this.pathJoin(storageName.PRIVATE_STORAGE_NAME, filename),
			absoluteStoragePath
		}
	}

	/**
	 * 将文件移动到切片任务中
	 * @returns 移动后的切片存储信息
	 * @throws {Error} 当切片文件的 `index` 和配置不匹配时或移动失败时抛出错误
	 */
	async moveFileToSlice(
		srcPath: string,
		sliceTaskId: string,
		currentIndex: string,
		isReplace?: boolean
	): Promise<FileStorageInfo> {
		if (!isString(srcPath)) {
			throw new TypeError('srcPath must be a string')
		}
		if (!isString(sliceTaskId)) {
			throw new TypeError('sliceTaskId must be a string')
		}
		if (!isString(currentIndex)) {
			throw new TypeError('currentIndex must be a string')
		}
		// if ((await this.isSliceTaskComplete(sliceTaskId))) {
		// 	throw new Error(`Slice task is complete, cannot move file to slice: ${sliceTaskId}`)
		// }
		if (!(await this._fm.isFileExist(srcPath))) {
			throw new Error(`srcPath file does not exist: ${srcPath}`)
		}
		const sliceDirPath = this.pathJoin(this._sliceStoragePath, sliceTaskId)
		const indexContent = await this.getStorageIndexContent(storageName.SLICE_STORAGE_NAME, sliceTaskId)
		const indexList: string[] = indexContent.indexList as string[]
		if (!indexList.includes(currentIndex)) {
			throw new Error(
				`File index ${currentIndex} is not in the slice task index content index list, cannot move file to slice: ${sliceTaskId}`
			)
		}
		const absoluteStoragePath = this.pathJoin(sliceDirPath, currentIndex)
		if (isReplace && (await this._fm.isFileExist(absoluteStoragePath))) {
			await this._fm.remove(absoluteStoragePath)
		}
		await this._fm.move(srcPath, absoluteStoragePath)
		return {
			parentPath: this._sliceStoragePath,
			name: currentIndex,
			relativeStoragePath: this.pathJoin(storageName.SLICE_STORAGE_NAME, sliceTaskId, currentIndex),
			absoluteStoragePath
		}
	}

	/**
	 * 将切片任务转换为片段存储
	 * - 该方法主要用途在于切片上传场景中, 当所有切片上传完成后, 可以调用该方法将切片任务转换为一个正式的片段存储
	 * - 片段存储的这些文件被认定为一个整体文件的不同片段
	 * - 片段存储目录下会自动生成一个配置清单 `json` 文件, 这个配置文件也是入口文件, 命名固定为 `storageName.INDEX_CONTENT_NAME`
	 * - 转换后原切片任务目录下的切片文件和配置清单不保留(已移动)
	 * @param taskId 任务ID, 对应要转换的切片任务ID
	 * @returns 转换后的片段存储信息
	 * @throws {Error} 当切片任务不存在或转换失败时抛出错误(如切片文件缺失还未上传完整等)
	 */
	async transformSliceTaskToFragment(
		sliceTaskId: string,
		target: typeof storageName.PUBLIC_STORAGE_NAME | typeof storageName.PRIVATE_STORAGE_NAME
	): Promise<FileStorageInfo> {
		if (!(await this.isSliceTaskComplete(sliceTaskId))) {
			throw new Error(`Slice task is not complete, cannot transform to fragment storage: ${sliceTaskId}`)
		}
		if (target !== storageName.PUBLIC_STORAGE_NAME && target !== storageName.PRIVATE_STORAGE_NAME) {
			throw new Error(`Invalid target for storage: ${String(target)}`)
		}
		const sliceDirPath = this.pathJoin(this._sliceStoragePath, sliceTaskId)
		const parentPath = target === storageName.PUBLIC_STORAGE_NAME ? this._publicStoragePath : this._privateStoragePath
		const filename = await this.createUniqueFilename(parentPath, Path.extname(sliceTaskId))
		const absoluteStoragePath = this.pathJoin(parentPath, filename)
		await this._fm.move(sliceDirPath, absoluteStoragePath)
		return {
			parentPath,
			name: filename,
			relativeStoragePath: this.pathJoin(target, filename),
			absoluteStoragePath
		}
	}

	/**
	 * 将切片任务中的切片文件合并成一个完整文件
	 * - 合并后原切片任务目录下的切片文件和配置清单将保留, 需自行手动清理
	 * @returns 合并后的文件的存储信息
	 * @throws {Error} 当切片任务不存在或合并失败时抛出错误(如切片文件缺失还未上传完整等)
	 */
	async mergeSliceToFile(
		sliceTaskId: string,
		ext: string,
		target: typeof storageName.PUBLIC_STORAGE_NAME | typeof storageName.PRIVATE_STORAGE_NAME
	): Promise<FileStorageInfo> {
		if (!isString(sliceTaskId)) {
			throw new TypeError('sliceTaskId must be a string')
		}
		if (!this.isLegalCharacter(ext)) {
			throw new TypeError('ext must be a legal character string')
		}
		if (target !== storageName.PUBLIC_STORAGE_NAME && target !== storageName.PRIVATE_STORAGE_NAME) {
			throw new Error(`Invalid target for fragment storage: ${String(target)}`)
		}
		if (!(await this.isSliceTaskComplete(sliceTaskId))) {
			throw new Error(`Slice task is not complete, cannot merge: ${sliceTaskId}`)
		}
		const currentDirPath = this.pathJoin(this._sliceStoragePath, sliceTaskId)
		const filename = await this.createUniqueFilename(currentDirPath, ext)
		const tempFilePath = this.pathJoin(currentDirPath, filename)
		const indexContentText = await this._fm.readToText(this.pathJoin(currentDirPath, storageName.INDEX_CONTENT_NAME))
		const indexContent = JSON.parse(indexContentText)
		const indexList: string[] = indexContent.indexList
		const chunkPaths = indexList.map((index) => this.pathJoin(currentDirPath, index))
		await this._fm.rwPipeFromPathList(chunkPaths, tempFilePath)
		const parentPath = target === storageName.PUBLIC_STORAGE_NAME ? this._publicStoragePath : this._privateStoragePath
		const targetPath = this.pathJoin(parentPath, filename)
		await this._fm.move(tempFilePath, targetPath)
		return {
			parentPath,
			name: filename,
			relativeStoragePath: this.pathJoin(target, filename),
			absoluteStoragePath: targetPath
		}
	}

	/**
	 * 检查切片任务是否已完成
	 * @returns true / false
	 * @throws {Error} 当切片任务不存在时抛出错误
	 */
	async isSliceTaskComplete(sliceTaskId: string) {
		if (!isString(sliceTaskId)) {
			throw new TypeError('sliceTaskId must be a string')
		}
		const sliceStorageDir = this.pathJoin(this._sliceStoragePath, sliceTaskId)
		const indexFilePath = this.pathJoin(sliceStorageDir, storageName.INDEX_CONTENT_NAME)
		if (!(await this._fm.isDirExist(sliceStorageDir))) {
			throw new Error(`Slice task does not exist: ${sliceTaskId}`)
		}
		const indexContentText = await this._fm.readToText(indexFilePath)
		const indexContent = JSON.parse(indexContentText)
		const indexList: string[] = indexContent.indexList
		const indexExistChecks = await Promise.all(
			indexList.map((index) => {
				return this._fm.isFileExist(this.pathJoin(sliceStorageDir, index))
			})
		)
		return indexExistChecks.every((exist) => exist)
	}

	/**
	 * 检查切片任务是否存在
	 * @returns true / false
	 */
	async isSliceTaskExist(sliceTaskId: string) {
		if (!isString(sliceTaskId)) {
			throw new TypeError('sliceTaskId must be a string')
		}
		const sliceStorageDir = this.pathJoin(this._sliceStoragePath, sliceTaskId)
		if (!(await this._fm.isDirExist(sliceStorageDir))) {
			return false
		}
		return true
	}

	/**
	 * 删除存储区指定文件或片段存储或分片任务
	 * - 该方法适用于公共存储区和私有存储区中的文件或片段存储或分片任务
	 * - 该操作并不是真正意义上的删除, 而是将文件移动到一个专门的删除存储区, 以避免误删导致的数据丢失
	 * - 移入的文件将被重命名为一个唯一的文件名以避免冲突
	 * - 移入的文件将被保存在删除存储区的根目录下
	 * @param target 文件或片段存储或分片任务目标名，可选值为公共存储名 或 私有存储名 或 分片任务名, 通过 `storageName` 获取名称常量
	 * @param name 待移动文件名称
	 * @returns 该文件在删除存储区中的信息
	 * @throws {Error} 当源文件不存在或移动失败时抛出错误
	 */
	async deleteFile(
		target:
			| typeof storageName.PUBLIC_STORAGE_NAME
			| typeof storageName.PRIVATE_STORAGE_NAME
			| typeof storageName.SLICE_STORAGE_NAME,
		name: string
	): Promise<FileStorageInfo> {
		if (
			target !== storageName.PUBLIC_STORAGE_NAME &&
			target !== storageName.PRIVATE_STORAGE_NAME &&
			target !== storageName.SLICE_STORAGE_NAME
		) {
			throw new Error(`Invalid target for storage: ${String(target)}`)
		}
		if (!isString(name)) {
			throw new TypeError('name must be a string')
		}
		const storageDir = (() => {
			if (target === storageName.PUBLIC_STORAGE_NAME) {
				return this._publicStoragePath
			}
			if (target === storageName.PRIVATE_STORAGE_NAME) {
				return this._privateStoragePath
			}
			return this._sliceStoragePath
		})()
		const filePath = this.pathJoin(storageDir, name)
		if (!(await this._fm.isExit(filePath))) {
			throw new Error(`file does not exist: ${filePath}`)
		}
		const filename = await this.createUniqueFilename(this._deleteStoragePath, Path.extname(name))
		const absoluteStoragePath = this.pathJoin(this._deleteStoragePath, filename)
		await this._fm.move(filePath, absoluteStoragePath)
		return {
			parentPath: this._deleteStoragePath,
			name: filename,
			relativeStoragePath: this.pathJoin(storageName.DELETE_STORAGE_NAME, filename),
			absoluteStoragePath
		}
	}

	/**
	 * 获取片段存储配置清单或分片任务配置清单内容
	 * @param target 片段存储或分片任务目标区，可选值为公共存储名 或 私有存储名 或 分片存储名, 通过 `storageName` 获取名称常量
	 * @param name 片段存储名称
	 */
	async getStorageIndexContent(
		target:
			| typeof storageName.PUBLIC_STORAGE_NAME
			| typeof storageName.PRIVATE_STORAGE_NAME
			| typeof storageName.SLICE_STORAGE_NAME,
		name: string
	): Promise<Record<string, unknown>> {
		if (
			target !== storageName.PUBLIC_STORAGE_NAME &&
			target !== storageName.PRIVATE_STORAGE_NAME &&
			target !== storageName.SLICE_STORAGE_NAME
		) {
			throw new Error(`Invalid target for fragment storage: ${String(target)}`)
		}
		if (!isString(name)) {
			throw new TypeError('name must be a string')
		}
		const storageDir = (() => {
			if (target === storageName.PUBLIC_STORAGE_NAME) {
				return this._publicStoragePath
			}
			if (target === storageName.PRIVATE_STORAGE_NAME) {
				return this._privateStoragePath
			}
			return this._sliceStoragePath
		})()
		const indexFilePath = this.pathJoin(storageDir, name, storageName.INDEX_CONTENT_NAME)
		if (!(await this._fm.isFileExist(indexFilePath))) {
			throw new Error(`Index file does not exist for fragment storage: ${name}`)
		}
		const indexContentText = await this._fm.readToText(indexFilePath)
		return JSON.parse(indexContentText)
	}

	/**
	 * 更新片段存储配置清单或分片任务配置清单内容
	 * @param target 片段存储或分片任务目标区，可选值为公共存储名 或 私有存储名 或 分片存储名, 通过 `storageName` 获取名称常量
	 * @param name 片段存储名称
	 */
	async updateStorageIndexContent<T extends Record<string, any>>(
		target:
			| typeof storageName.PUBLIC_STORAGE_NAME
			| typeof storageName.PRIVATE_STORAGE_NAME
			| typeof storageName.SLICE_STORAGE_NAME,
		name: string,
		data: T
	): Promise<T> {
		if (
			target !== storageName.PUBLIC_STORAGE_NAME &&
			target !== storageName.PRIVATE_STORAGE_NAME &&
			target !== storageName.SLICE_STORAGE_NAME
		) {
			throw new Error(`Invalid target for fragment storage: ${String(target)}`)
		}
		if (!isString(name)) {
			throw new TypeError('name must be a string')
		}
		if (!isObject(data)) {
			throw new TypeError('data must be an object')
		}
		const storageDir = (() => {
			if (target === storageName.PUBLIC_STORAGE_NAME) {
				return this._publicStoragePath
			}
			if (target === storageName.PRIVATE_STORAGE_NAME) {
				return this._privateStoragePath
			}
			return this._sliceStoragePath
		})()
		const indexFilePath = this.pathJoin(storageDir, name, storageName.INDEX_CONTENT_NAME)
		if (!(await this._fm.isFileExist(indexFilePath))) {
			throw new Error(`Index file does not exist for fragment storage: ${name}`)
		}
		await this._fm.writeFileFromText(indexFilePath, JSON.stringify(data))
		return data
	}

	/**
	 * 更改片段存储配置清单或分片任务配置清单内容
	 * @param target 片段存储或分片任务目标区，可选值为公共存储名 或 私有存储名 或 分片存储名, 通过 `storageName` 获取名称常量
	 * @param name 片段存储名称
	 */
	async patchStorageIndexContent<T extends Record<string, any>>(
		target:
			| typeof storageName.PUBLIC_STORAGE_NAME
			| typeof storageName.PRIVATE_STORAGE_NAME
			| typeof storageName.SLICE_STORAGE_NAME,
		name: string,
		data: T
	): Promise<T> {
		if (
			target !== storageName.PUBLIC_STORAGE_NAME &&
			target !== storageName.PRIVATE_STORAGE_NAME &&
			target !== storageName.SLICE_STORAGE_NAME
		) {
			throw new Error(`Invalid target for fragment storage: ${String(target)}`)
		}
		if (!isString(name)) {
			throw new TypeError('name must be a string')
		}
		if (!isObject(data)) {
			throw new TypeError('data must be an object')
		}
		const storageDir = (() => {
			if (target === storageName.PUBLIC_STORAGE_NAME) {
				return this._publicStoragePath
			}
			if (target === storageName.PRIVATE_STORAGE_NAME) {
				return this._privateStoragePath
			}
			return this._sliceStoragePath
		})()
		const indexFilePath = this.pathJoin(storageDir, name, storageName.INDEX_CONTENT_NAME)
		if (!(await this._fm.isFileExist(indexFilePath))) {
			throw new Error(`Index file does not exist for fragment storage: ${name}`)
		}
		const indexContentText = await this._fm.readToText(indexFilePath)
		const oldData = JSON.parse(indexContentText)
		const newData = { ...oldData, ...data }
		await this._fm.writeFileFromText(indexFilePath, JSON.stringify(newData))
		return newData
	}

	/**
	 * 创建一个分片任务
	 * - 该方法主要用途在于切片上传场景
	 * - 若分片任务已已存在则直接返回，不会重复创建
	 * @param taskId 任务ID, 由调用方生成并传入, 推荐使用切片的 `index` 按切片顺序拼接 + 文件大小, 文件扩展名等固定信息生成, 可以保证同一个文件生成一致, 在断点续传可用
	 * @param taskSliceIndexList 切片 `index` 列表, 需保证列表顺序与切片顺序一致, 以便后续根据该列表顺序合并切片生成完整文件
	 */
	async createSliceTask(
		taskId: string,
		taskSliceIndexList: string[],
		meta?: Record<string, any>
	): Promise<SliceFileStorageInfo> {
		if (!isString(taskId)) {
			throw new TypeError('taskId must be a string')
		}
		if (!this.isLegalCharacter(taskId)) {
			throw new Error(`taskId can only contain letters, rule: A-Za-z0-9-_. `)
		}
		if (!isArray(taskSliceIndexList)) {
			throw new TypeError('taskSliceIndexList must be an array of strings')
		}
		if (!taskSliceIndexList.length) {
			throw new Error('taskSliceIndexList cannot be empty')
		}
		const sliceStorageDir = this.pathJoin(this._sliceStoragePath, taskId)
		const indexFilePath = this.pathJoin(sliceStorageDir, storageName.INDEX_CONTENT_NAME)
		if (await this._fm.isDirExist(sliceStorageDir)) {
			const indexContentText = await this._fm.readToText(indexFilePath)
			const indexContent = JSON.parse(indexContentText)
			if (
				!(
					isObject(indexContent) &&
					isArray(indexContent.indexList) &&
					indexContent.indexList.length === taskSliceIndexList.length &&
					indexContent.indexList.every((index: string, i: number) => index === taskSliceIndexList[i])
				)
			) {
				throw new Error(`Slice task with id ${taskId} already exists but has different slice index list`)
			}
			return {
				parentPath: this._sliceStoragePath,
				name: taskId,
				relativeStoragePath: this.pathJoin(storageName.SLICE_STORAGE_NAME, taskId),
				absoluteStoragePath: sliceStorageDir,
				indexParentPath: sliceStorageDir,
				indexName: storageName.INDEX_CONTENT_NAME,
				relativeIndexPath: this.pathJoin(storageName.SLICE_STORAGE_NAME, taskId, storageName.INDEX_CONTENT_NAME),
				absoluteIndexPath: indexFilePath
			}
		}
		await this._fm.createDir(this._sliceStoragePath, taskId)
		const indexContent: Record<string, any> = {
			indexList: taskSliceIndexList
		}
		if (meta) {
			Object.assign(indexContent, meta)
		}
		await this._fm.writeFileFromText(indexFilePath, JSON.stringify(indexContent))
		return {
			parentPath: this._sliceStoragePath,
			name: taskId,
			relativeStoragePath: this.pathJoin(storageName.SLICE_STORAGE_NAME, taskId),
			absoluteStoragePath: sliceStorageDir,
			indexParentPath: sliceStorageDir,
			indexName: storageName.INDEX_CONTENT_NAME,
			relativeIndexPath: this.pathJoin(storageName.SLICE_STORAGE_NAME, taskId, storageName.INDEX_CONTENT_NAME),
			absoluteIndexPath: indexFilePath
		}
	}

	/**
	 * 是否为 `FileStorage` 认定的合法字符
	 * - 合法字符: `A-Za-z0-9-_. `
	 * @param str 需要校验的字符串
	 * @returns true / false
	 */
	isLegalCharacter(str: string) {
		if (!isString(str)) {
			throw new TypeError('str must be a string')
		}
		if (str.length === 0) {
			return true
		}
		const legalRule = /[A-Za-z0-9\-_\. ]+/
		return legalRule.test(str)
	}

	/**
	 * 在指定目录下创建一个唯一的文件名
	 * @param dirPath 目录路径
	 * @param ext 原文件扩展名（带点）
	 */
	async createUniqueFilename(dirPath: string, ext: string) {
		if (!this.isLegalCharacter(ext)) {
			throw new TypeError('ext must be a legal character string')
		}
		let filename = `${crypto.randomUUID()}-${Date.now()}${ext}`
		while (await this._fm.isFileExist(this.pathJoin(dirPath, filename))) {
			filename = `${crypto.randomUUID()}-${Date.now()}${ext}`
		}
		return filename
	}

	/**
	 * 重新封装后的路径连接方法，确保路径分隔符统一为 `/`
	 * @param paths 路径片段列表
	 */
	pathJoin(...paths: string[]) {
		return this.pathDelimiterToUnix(Path.join(...paths))
	}

	/**
	 * 将路径分隔符一律转为 `/`
	 * @param path 路径字符串
	 */
	pathDelimiterToUnix(path: string) {
		return path.replaceAll('\\', '/').replaceAll('//', '/')
	}

	/**
	 * 初始化存储目录
	 */
	private _initStorage() {
		this._fm.createDirSync(this._storagePath, storageName.PUBLIC_STORAGE_NAME, { recursive: true })
		this._fm.createDirSync(this._storagePath, storageName.PRIVATE_STORAGE_NAME, { recursive: true })
		this._fm.createDirSync(this._storagePath, storageName.DELETE_STORAGE_NAME, { recursive: true })
		this._fm.createDirSync(this._storagePath, storageName.SLICE_STORAGE_NAME, { recursive: true })
	}
}
