/** 判断 DOMException 是否为 NotFoundError 或 TypeMismatchError（路径存在但类型不匹配） */
function isNotFoundLikeError(e: unknown): boolean {
	return e instanceof DOMException && (e.name === 'NotFoundError' || e.name === 'TypeMismatchError')
}

type IterableFileSystemDirectoryHandle = FileSystemDirectoryHandle & {
	entries(): AsyncIterableIterator<[string, FileSystemDirectoryHandle | FileSystemFileHandle]>
	keys(): AsyncIterableIterator<string>
}

export interface FileSystemTreeFile {
	/** 文件对象 */
	file: File
	/** 相对于所选目录内部的路径，不包含所选根目录名称 */
	relativePath: string
}

export interface FileSystemTreeSnapshot {
	/** 所选目录名称，仅用于界面展示，不会出现在相对路径中 */
	rootNames: string[]
	/** 全部目录路径，包含空目录 */
	directories: string[]
	/** 全部文件及其相对路径 */
	files: FileSystemTreeFile[]
}

interface LegacyFileEntry {
	isFile: true
	isDirectory: false
	name: string
	file(success: (file: File) => void, error?: (error: DOMException) => void): void
}

interface LegacyDirectoryReader {
	readEntries(
		success: (entries: LegacyFileSystemEntry[]) => void,
		error?: (error: DOMException) => void
	): void
}

interface LegacyDirectoryEntry {
	isFile: false
	isDirectory: true
	name: string
	createReader(): LegacyDirectoryReader
}

type LegacyFileSystemEntry = LegacyFileEntry | LegacyDirectoryEntry

type DirectoryDataTransferItem = DataTransferItem & {
	getAsEntry?: () => LegacyFileSystemEntry | null
	webkitGetAsEntry?: () => LegacyFileSystemEntry | null
	getAsFileSystemHandle?: () => Promise<FileSystemHandle | null>
}

/** 判断是否应该降级尝试目录操作（文件不存在或路径为目录） */
function shouldFallbackToDirectory(e: unknown): boolean {
	return e instanceof DOMException && (e.name === 'NotFoundError' || e.name === 'TypeMismatchError')
}

/** 文件管理器 */
export class FileSystemManage {
	/** 根目录句柄 */
	rootDirHandle: FileSystemDirectoryHandle

	/**
	 * 文件管理器
	 * @param rootHandle 根目录句柄
	 */
	constructor(rootHandle: FileSystemDirectoryHandle) {
		this.rootDirHandle = rootHandle
	}

	/**
	 * 根据文件名获取文件
	 * @param filename 文件名
	 * @param options 获取文件的选项
	 * @param dirHandle 目录句柄，默认为根目录
	 * @return File对象
	 */
	async getFileByName(
		filename: string,
		options?: FileSystemGetFileOptions,
		dirHandle: FileSystemDirectoryHandle = this.rootDirHandle
	): Promise<File> {
		const fileHandle = await dirHandle.getFileHandle(filename, options)
		return fileHandle.getFile()
	}

	/**
	 * 根据文件名获取文件可读流。
	 * @param filename 文件名。
	 * @param options 获取文件的选项。
	 * @param dirHandle 目录句柄，默认为根目录。
	 * @returns 文件内容可读流。
	 */
	async readFileStreamByName(
		filename: string,
		options?: FileSystemGetFileOptions,
		dirHandle: FileSystemDirectoryHandle = this.rootDirHandle
	): Promise<ReadableStream<Uint8Array>> {
		const file = await this.getFileByName(filename, options, dirHandle)
		return file.stream()
	}

	/**
	 * 根据路径获取文件可读流。
	 * @param path 文件路径。
	 * @returns 文件内容可读流。
	 */
	async readFileStreamByPath(path: string): Promise<ReadableStream<Uint8Array>> {
		const { dir, name } = await this._resolveParentDir(path)
		return this.readFileStreamByName(name, void 0, dir)
	}

	/**
	 * 根据文件名获取Blob对象
	 * @param filename 文件名
	 * @param options 获取文件的选项
	 * @param dirHandle 目录句柄，默认为根目录
	 * @returns Blob对象
	 */
	async getBlobByName(
		filename: string,
		options?: FileSystemGetFileOptions,
		dirHandle: FileSystemDirectoryHandle = this.rootDirHandle
	): Promise<Blob> {
		const file = await this.getFileByName(filename, options, dirHandle)
		return file.slice()
	}

	/**
	 * 根据文件名获取ArrayBuffer对象
	 * @param filename 文件名
	 * @param options 获取文件的选项
	 * @param dirHandle 目录句柄，默认为根目录
	 * @returns ArrayBuffer对象
	 */
	async getFileBufferByName(
		filename: string,
		options?: FileSystemGetFileOptions,
		dirHandle: FileSystemDirectoryHandle = this.rootDirHandle
	): Promise<ArrayBuffer> {
		const file = await this.getFileByName(filename, options, dirHandle)
		return file.arrayBuffer()
	}

	/**
	 * 根据文件名读取文件内容为文本
	 * @param filename 文件名
	 * @param options 读取文件的选项
	 * @param dirHandle 目录句柄，默认为根目录
	 * @returns 文件内容为文本
	 */
	async readFileToTextByName(
		filename: string,
		options?: FileSystemGetFileOptions,
		dirHandle: FileSystemDirectoryHandle = this.rootDirHandle
	): Promise<string> {
		const file = await this.getFileByName(filename, options, dirHandle)
		return file.text()
	}

	/**
	 * 获取目录下的文件信息列表
	 * - 需要迭代器请使用 `dirHandle.entries()` 方法
	 * @param dirHandle 目录句柄
	 * @returns 文件信息列表
	 */
	async getFileInfoList(dirHandle: FileSystemDirectoryHandle = this.rootDirHandle) {
		const entries = (dirHandle as IterableFileSystemDirectoryHandle).entries()
		return Array.fromAsync(entries)
	}

	/**
	 * 获取目录下的文件名列表
	 * - 需要迭代器请使用 `dirHandle.keys()` 方法
	 * @param dirHandle 目录句柄
	 * @returns 文件名列表
	 */
	async getFilenameList(dirHandle: FileSystemDirectoryHandle = this.rootDirHandle) {
		const keys = (dirHandle as IterableFileSystemDirectoryHandle).keys()
		return Array.fromAsync(keys)
	}

	/**
	 * 递归读取所选目录下的内容。
	 * - 所选目录自身不会加入目录列表。
	 * - 返回的目录列表包含全部子目录和空子目录。
	 * - 文件路径与目录路径均相对于所选目录内部。
	 * @returns 包含所选目录名称、子目录路径和文件信息的目录树快照。
	 */
	async getTreeSnapshot(): Promise<FileSystemTreeSnapshot> {
		const directories = new Set<string>()
		const files: FileSystemTreeFile[] = []
		const entries = await this.getFileInfoList(this.rootDirHandle)
		for (const [name, handle] of entries) {
			if (handle.kind === 'directory') {
				await this._collectTree(handle, name, directories, files)
				continue
			}

			files.push({
				file: await handle.getFile(),
				relativePath: name
			})
		}
		return {
			rootNames: [this.rootDirHandle.name],
			directories: FileSystemManage._sortDirectoryPaths(directories),
			files
		}
	}

	/**
	 * 递归收集指定目录及其全部子项。
	 * - 进入目录时先登记路径，以保留没有子项的空目录。
	 * @param dirHandle 当前读取的目录句柄。
	 * @param relativePath 当前目录相对于所选目录内部的路径。
	 * @param directories 用于收集目录路径的集合。
	 * @param files 用于收集文件及其相对路径的列表。
	 */
	private async _collectTree(
		dirHandle: FileSystemDirectoryHandle,
		relativePath: string,
		directories: Set<string>,
		files: FileSystemTreeFile[]
	) {
		// 先登记当前目录，确保没有子项的空目录也保留在快照中。
		directories.add(relativePath)
		const entries = await this.getFileInfoList(dirHandle)
		for (const [name, handle] of entries) {
			const childPath = `${relativePath}/${name}`
			if (handle.kind === 'directory') {
				await this._collectTree(handle, childPath, directories, files)
				continue
			}

			files.push({
				file: await handle.getFile(),
				relativePath: childPath
			})
		}
	}

	/**
	 * 从拖拽数据中读取完整目录树。
	 * - 仅接受一个或多个目录，不接受直接拖入文件。
	 * - 优先使用 File System Access API，兼容 Chromium 的 FileSystemEntry API。
	 * - 仅读取拖入目录的内部内容，不包含拖入目录自身。
	 * - 返回的目录列表包含全部子目录和空子目录。
	 * @param dataTransfer 拖拽事件中的数据传输对象。
	 * @returns 包含顶层目录名称、完整目录路径和文件信息的目录树快照。
	 * @throws 当拖拽内容不是目录或浏览器不支持目录拖拽时抛出错误。
	 */
	static async getDroppedDirectoryTree(dataTransfer: DataTransfer): Promise<FileSystemTreeSnapshot> {
		const items = Array.from(dataTransfer.items).filter(
			(item) => item.kind === 'file'
		) as DirectoryDataTransferItem[]
		if (!items.length) {
			throw new Error('请拖入目录')
		}

		if (items.every((item) => item.getAsFileSystemHandle)) {
			const handles = (
				await Promise.all(items.map((item) => item.getAsFileSystemHandle?.() ?? null))
			).filter((handle): handle is FileSystemHandle => !!handle)
			if (!handles.length || handles.some((handle) => handle.kind !== 'directory')) {
				throw new Error('仅支持拖入目录，不支持直接拖入文件')
			}

			const snapshots = await Promise.all(
				handles.map((handle) =>
					new FileSystemManage(handle as FileSystemDirectoryHandle).getTreeSnapshot()
				)
			)
			return FileSystemManage._mergeTreeSnapshots(snapshots)
		}

		if (items.every((item) => item.getAsEntry || item.webkitGetAsEntry)) {
			const entries = items
				.map((item) => item.getAsEntry?.() ?? item.webkitGetAsEntry?.() ?? null)
				.filter((entry): entry is LegacyFileSystemEntry => !!entry)
			if (!entries.length || entries.some((entry) => !entry.isDirectory)) {
				throw new Error('仅支持拖入目录，不支持直接拖入文件')
			}

			const directories = new Set<string>()
			const files: FileSystemTreeFile[] = []
			for (const entry of entries) {
				const children = await FileSystemManage._readLegacyDirectoryEntries(entry as LegacyDirectoryEntry)
				for (const child of children) {
					if (child.isDirectory) {
						await FileSystemManage._collectLegacyDirectory(child, child.name, directories, files)
						continue
					}

					files.push({
						file: await FileSystemManage._readLegacyFile(child),
						relativePath: child.name
					})
				}
			}
			return {
				rootNames: entries.map((entry) => entry.name),
				directories: FileSystemManage._sortDirectoryPaths(directories),
				files
			}
		}

		throw new Error('当前浏览器不支持目录拖拽，请点击选择目录')
	}

	/**
	 * 递归收集 FileSystemEntry 目录及其全部子项。
	 * @param entry 当前读取的目录入口。
	 * @param relativePath 当前目录相对于拖拽目录内部的路径。
	 * @param directories 用于收集目录路径的集合。
	 * @param files 用于收集文件及其相对路径的列表。
	 */
	private static async _collectLegacyDirectory(
		entry: LegacyDirectoryEntry,
		relativePath: string,
		directories: Set<string>,
		files: FileSystemTreeFile[]
	) {
		directories.add(relativePath)
		const children = await FileSystemManage._readLegacyDirectoryEntries(entry)
		for (const child of children) {
			const childPath = `${relativePath}/${child.name}`
			if (child.isDirectory) {
				await FileSystemManage._collectLegacyDirectory(child, childPath, directories, files)
				continue
			}

			files.push({
				file: await FileSystemManage._readLegacyFile(child),
				relativePath: childPath
			})
		}
	}

	/**
	 * 持续读取 FileSystemEntry 目录，直到浏览器返回空列表。
	 * @param entry 需要读取的目录入口。
	 * @returns 目录中的全部直接子项。
	 */
	private static _readLegacyDirectoryEntries(entry: LegacyDirectoryEntry) {
		const reader = entry.createReader()
		const entries: LegacyFileSystemEntry[] = []
		return new Promise<LegacyFileSystemEntry[]>((resolve, reject) => {
			const readNext = () => {
				reader.readEntries((nextEntries) => {
					if (!nextEntries.length) {
						resolve(entries)
						return
					}
					entries.push(...nextEntries)
					readNext()
				}, reject)
			}
			readNext()
		})
	}

	/**
	 * 将 FileSystemEntry 文件入口转换为 File。
	 * @param entry 需要读取的文件入口。
	 * @returns 文件对象。
	 */
	private static _readLegacyFile(entry: LegacyFileEntry) {
		return new Promise<File>((resolve, reject) => {
			entry.file(resolve, reject)
		})
	}

	/**
	 * 合并多个顶层目录的目录树快照。
	 * @param snapshots 需要合并的目录树快照。
	 * @returns 合并并去重排序后的目录树快照。
	 */
	private static _mergeTreeSnapshots(snapshots: FileSystemTreeSnapshot[]): FileSystemTreeSnapshot {
		return {
			rootNames: snapshots.flatMap((snapshot) => snapshot.rootNames),
			directories: FileSystemManage._sortDirectoryPaths(
				snapshots.flatMap((snapshot) => snapshot.directories)
			),
			files: snapshots.flatMap((snapshot) => snapshot.files)
		}
	}

	/**
	 * 按目录深度和名称排序，并移除重复路径。
	 * @param paths 需要整理的目录路径。
	 * @returns 去重并排序后的目录路径。
	 */
	private static _sortDirectoryPaths(paths: Iterable<string>) {
		return [...new Set(paths)].sort((a, b) => {
			const depthDiff = a.split('/').length - b.split('/').length
			return depthDiff || a.localeCompare(b)
		})
	}

	/**
	 * 通过Blob对象写入文件
	 * @param filename 文件名
	 * @param blob Blob对象
	 * @param dirHandle 目录句柄，默认为根目录
	 */
	async writeFileFromBlob(filename: string, blob: Blob, dirHandle: FileSystemDirectoryHandle = this.rootDirHandle) {
		const fileHandle = await dirHandle.getFileHandle(filename, { create: true })
		const writable = await fileHandle.createWritable()
		await writable.write(blob)
		await writable.close()
		return fileHandle
	}

	/**
	 * 将可读流持续写入指定文件句柄。
	 * @param fileHandle 文件句柄。
	 * @param stream 文件内容可读流。
	 * @returns 写入完成后的文件句柄。
	 */
	async writeFileStreamByHandle(fileHandle: FileSystemFileHandle, stream: ReadableStream<Uint8Array>) {
		const reader = stream.getReader()
		const writable = await fileHandle.createWritable()

		try {
			while (true) {
				const { done, value } = await reader.read()
				if (done) break
				const chunk = new Uint8Array(value.byteLength)
				chunk.set(value)
				await writable.write(chunk)
			}

			await writable.close()
			return fileHandle
		} catch (error) {
			await reader.cancel(error).catch(() => void 0)
			await writable.abort(error).catch(() => void 0)
			throw error
		} finally {
			reader.releaseLock()
		}
	}

	/**
	 * 根据文件名流式写入文件。
	 * @param filename 文件名。
	 * @param stream 文件内容可读流。
	 * @param dirHandle 目录句柄，默认为根目录。
	 * @returns 写入完成后的文件句柄。
	 */
	async writeFileFromStream(
		filename: string,
		stream: ReadableStream<Uint8Array>,
		dirHandle: FileSystemDirectoryHandle = this.rootDirHandle
	) {
		const fileHandle = await dirHandle.getFileHandle(filename, { create: true })
		return this.writeFileStreamByHandle(fileHandle, stream)
	}

	/**
	 * 根据路径流式写入文件。
	 * @param path 文件路径。
	 * @param stream 文件内容可读流。
	 * @returns 写入完成后的文件句柄。
	 */
	async writeFileByPathFromStream(path: string, stream: ReadableStream<Uint8Array>) {
		const { dir, name } = await this._resolveParentDir(path, true)
		return this.writeFileFromStream(name, stream, dir)
	}

	/**
	 * 通过路径写入文件
	 * @param path 文件路径
	 * @param content 写入内容
	 */
	async writeFileByPath(path: string, content: FileSystemWriteChunkType) {
		const { dir, name } = await this._resolveParentDir(path, true)
		const fileHandle = await dir.getFileHandle(name, { create: true })
		const writable = await fileHandle.createWritable()
		await writable.write(content)
		await writable.close()
		return fileHandle
	}

	/**
	 * 通过ArrayBuffer对象写入文件
	 * @param filename 文件名
	 * @param buffer ArrayBuffer对象
	 * @param dirHandle 目录句柄，默认为根目录
	 */
	async writeFileFromBuffer(
		filename: string,
		buffer: ArrayBuffer,
		dirHandle: FileSystemDirectoryHandle = this.rootDirHandle
	) {
		const fileHandle = await dirHandle.getFileHandle(filename, { create: true })
		const writable = await fileHandle.createWritable()
		await writable.write(buffer)
		await writable.close()
		return fileHandle
	}

	/**
	 * 通过文本内容写入文件
	 * @param filename 文件名
	 * @param text 文本内容
	 * @param dirHandle 目录句柄，默认为根目录
	 */
	async writeFileFromText(filename: string, text: string, dirHandle: FileSystemDirectoryHandle = this.rootDirHandle) {
		const fileHandle = await dirHandle.getFileHandle(filename, { create: true })
		const writable = await fileHandle.createWritable()
		await writable.write(text)
		await writable.close()
		return fileHandle
	}

	/**
	 * 创建目录
	 * - 如果目录已存在则不做任何操作
	 * @param dirname 目录名
	 * @param dirHandle 目录句柄，默认为根目录
	 */
	async createDir(dirname: string, dirHandle: FileSystemDirectoryHandle = this.rootDirHandle) {
		return dirHandle.getDirectoryHandle(dirname, { create: true })
	}

	/**
	 * 通过路径创建目录
	 * - 如果目录已存在则不做任何操作
	 * @param path 目录路径
	 */
	async createDirByPath(path: string) {
		const parts = path.split('/').filter(Boolean)
		let dir = this.rootDirHandle

		for (const part of parts) {
			dir = await dir.getDirectoryHandle(part, { create: true })
		}

		return dir
	}

	/**
	 * 删除文件或目录
	 * - 如果是目录则会递归删除目录下的所有内容
	 * @param filename 文件或目录名
	 * @param dirHandle 目录句柄，默认为根目录
	 */
	async remove(filename: string, dirHandle: FileSystemDirectoryHandle = this.rootDirHandle) {
		if (await this.isExistByHandle(dirHandle, filename)) {
			return dirHandle.removeEntry(filename, { recursive: true })
		}
	}

	/**
	 * 通过文件名追加内容到文件末尾
	 * @param filename 文件名
	 * @param content 内容
	 * @param dirHandle 目录句柄，默认为根目录
	 */
	async appendFileByName(
		filename: string,
		content: FileSystemWriteChunkType,
		dirHandle: FileSystemDirectoryHandle = this.rootDirHandle
	) {
		const fileHandle = await dirHandle.getFileHandle(filename, {
			create: true
		})

		const file = await fileHandle.getFile()
		const writable = await fileHandle.createWritable({
			keepExistingData: true
		})

		await writable.seek(file.size)
		await writable.write(content)
		await writable.close()
		return fileHandle
	}

	/**
	 * 通过文件句柄追加内容到文件末尾
	 * @param fileHandle 文件句柄
	 * @param content 内容
	 */
	async appendFileByHandle(fileHandle: FileSystemFileHandle, content: FileSystemWriteChunkType) {
		const file = await fileHandle.getFile()
		const writable = await fileHandle.createWritable({
			keepExistingData: true
		})
		await writable.seek(file.size)
		await writable.write(content)
		await writable.close()
		return fileHandle
	}

	/**
	 * 通过文件名复制文件或目录
	 * @param oldName 旧文件或目录名
	 * @param newName 新文件或目录名
	 * @param dirHandle 源目录句柄, 默认为根目录
	 * @param targetHandle 目标目录句柄, 默认为根目录
	 */
	async copyByHandle(
		oldName: string,
		newName: string,
		dirHandle: FileSystemDirectoryHandle = this.rootDirHandle,
		targetHandle: FileSystemDirectoryHandle = this.rootDirHandle
	) {
		if (await this.isExistByHandle(targetHandle, newName)) {
			throw new Error(`target is exit: ${newName}`)
		}

		let sourceHandle: FileSystemFileHandle

		try {
			sourceHandle = await dirHandle.getFileHandle(oldName)
		} catch (e) {
			if (!shouldFallbackToDirectory(e)) throw e

			// 目录复制
			const sourceDirHandle = await dirHandle.getDirectoryHandle(oldName)
			const destDirHandle = await targetHandle.getDirectoryHandle(newName, {
				create: true
			})

			for await (const [childName] of (sourceDirHandle as IterableFileSystemDirectoryHandle).entries()) {
				await this.copyByHandle(childName, childName, sourceDirHandle, destDirHandle)
			}
			return destDirHandle
		}

		// 文件复制
		const file = await sourceHandle.getFile()

		const destHandle = await targetHandle.getFileHandle(newName, {
			create: true
		})

		const writable = await destHandle.createWritable()

		await writable.write(file)
		await writable.close()
		return destHandle
	}

	/**
	 * 通过路径复制文件
	 * @param sourcePath 源文件路径
	 * @param targetPath 目标文件路径
	 */
	async copy(sourcePath: string, targetPath: string) {
		const { dir: sourceDir, name: sourceName } = await this._resolveParentDir(sourcePath)
		const { dir: targetDir, name: targetName } = await this._resolveParentDir(targetPath, true)
		return this._copyEntry(sourceDir, sourceName, targetDir, targetName)
	}

	private async _copyEntry(
		sourceParent: FileSystemDirectoryHandle,
		sourceName: string,
		targetParent: FileSystemDirectoryHandle,
		targetName: string
	) {
		if (await this.isExistByHandle(targetParent, targetName)) {
			throw new Error(`target is exit: ${targetName}`)
		}

		let sourceHandle: FileSystemFileHandle

		try {
			sourceHandle = await sourceParent.getFileHandle(sourceName)
		} catch (e) {
			if (!shouldFallbackToDirectory(e)) throw e

			// 目录
			const sourceDir = await sourceParent.getDirectoryHandle(sourceName)

			const targetDir = await targetParent.getDirectoryHandle(targetName, {
				create: true
			})

			for await (const [childName] of (sourceDir as IterableFileSystemDirectoryHandle).entries()) {
				await this._copyEntry(sourceDir, childName, targetDir, childName)
			}

			return targetDir
		}

		// 文件
		const file = await sourceHandle.getFile()

		const targetHandle = await targetParent.getFileHandle(targetName, {
			create: true
		})

		const writable = await targetHandle.createWritable()

		await writable.write(file)
		await writable.close()
		return targetHandle
	}

	/**
	 * 重命名文件或目录
	 * @param oldName 旧文件或目录名
	 * @param newName 新文件或目录名
	 * @param dirHandle 源目录句柄
	 * @param targetHandle 目标目录句柄
	 */
	async renameByHandle(
		oldName: string,
		newName: string,
		dirHandle: FileSystemDirectoryHandle = this.rootDirHandle,
		targetHandle: FileSystemDirectoryHandle = this.rootDirHandle
	) {
		await this.copyByHandle(oldName, newName, dirHandle, targetHandle)
		return dirHandle.removeEntry(oldName, { recursive: true })
	}

	/**
	 * 通过路径重命名文件或目录
	 * @param oldPath 旧文件或目录路径
	 * @param newPath 新文件或目录路径
	 */
	async rename(oldPath: string, newPath: string) {
		const { dir: sourceDir, name: sourceName } = await this._resolveParentDir(oldPath)
		const { dir: targetDir, name: targetName } = await this._resolveParentDir(newPath, true)
		return this.renameByHandle(sourceName, targetName, sourceDir, targetDir)
	}

	private async _resolveParentDir(
		path: string,
		create = false
	): Promise<{
		dir: FileSystemDirectoryHandle
		name: string
	}> {
		const parts = path.split('/').filter(Boolean)

		if (parts.length === 0) {
			throw new Error('Invalid path')
		}

		const name = parts.pop()!

		let dir = this.rootDirHandle

		for (const part of parts) {
			dir = await dir.getDirectoryHandle(part, {
				create
			})
		}

		return {
			dir,
			name
		}
	}

	/**
	 * 通过路径判断文件或目录是否存在
	 * @param path 文件或目录路径
	 */
	async isExist(path: string): Promise<boolean> {
		const { dir, name } = await this._resolveParentDir(path)

		try {
			await dir.getFileHandle(name)
			return true
		} catch (e) {
			if (!isNotFoundLikeError(e)) throw e
		}

		try {
			await dir.getDirectoryHandle(name)
			return true
		} catch (e) {
			if (!isNotFoundLikeError(e)) throw e
		}

		return false
	}

	/**
	 * 判断路径是否为文件
	 * - 可以用来判断文件是否存在
	 * @param path 文件路径
	 */
	async isFile(path: string): Promise<boolean> {
		try {
			const { dir, name } = await this._resolveParentDir(path)
			await dir.getFileHandle(name)
			return true
		} catch (e) {
			if (!isNotFoundLikeError(e)) throw e
			return false
		}
	}

	/**
	 * 判断路径是否为目录
	 * - 可以用来判断目录是否存在
	 * @param path 目录路径
	 */
	async isDir(path: string): Promise<boolean> {
		try {
			const { dir, name } = await this._resolveParentDir(path)
			await dir.getDirectoryHandle(name)
			return true
		} catch (e) {
			if (!isNotFoundLikeError(e)) throw e
			return false
		}
	}

	/**
	 * 通过目录句柄+名称判断文件或目录是否存在
	 * @param dirHandle 目录句柄
	 * @param name 文件或目录名
	 */
	async isExistByHandle(dirHandle: FileSystemDirectoryHandle, name: string): Promise<boolean> {
		try {
			await dirHandle.getFileHandle(name)
			return true
		} catch (e) {
			if (!isNotFoundLikeError(e)) throw e
		}

		try {
			await dirHandle.getDirectoryHandle(name)
			return true
		} catch (e) {
			if (!isNotFoundLikeError(e)) throw e
		}

		return false
	}

	/**
	 * 判断给定目录句柄下的名称是否为文件
	 * @param dirHandle 目录句柄
	 * @param name 文件名
	 */
	async isFileByHandle(dirHandle: FileSystemDirectoryHandle, name: string): Promise<boolean> {
		try {
			await dirHandle.getFileHandle(name)
			return true
		} catch (e) {
			if (!isNotFoundLikeError(e)) throw e
			return false
		}
	}

	/**
	 * 判断给定目录句柄下的名称是否为目录
	 * @param dirHandle 目录句柄
	 * @param name 目录名
	 */
	async isDirByHandle(dirHandle: FileSystemDirectoryHandle, name: string): Promise<boolean> {
		try {
			await dirHandle.getDirectoryHandle(name)
			return true
		} catch (e) {
			if (!isNotFoundLikeError(e)) throw e
			return false
		}
	}
}

export interface SelectDirOptions {
	id?: string
	mode?: 'read' | 'readwrite'
	startIn?: string
}

/**
 * 选择目录
 * - 文档: https://developer.mozilla.org/zh-CN/docs/Web/API/Window/showDirectoryPicker
 */
export async function selectDir(options: SelectDirOptions = {}): Promise<FileSystemDirectoryHandle> {
	if (typeof (globalThis as any).showDirectoryPicker !== 'function') {
		throw new Error('showDirectoryPicker is not available in this environment')
	}
	const fileSystemDirHandle = (await (globalThis as any).showDirectoryPicker(options)) as FileSystemDirectoryHandle
	// 如果是可写句柄, 写入临时文件占位, 防止系统收回权限
	// 如果是可读句柄, 读取文件触发占位, 防止系统收回权限
	if (options.mode === 'read') {
		await new FileSystemManage(fileSystemDirHandle).isExist('__temp__')
	} else if (options.mode === 'readwrite') {
		const fileSystemManage = new FileSystemManage(fileSystemDirHandle)
		await fileSystemManage.writeFileFromText('__temp__', 'temp')
		await fileSystemManage.remove('__temp__')
	}
	return fileSystemDirHandle
}
