import type { ComputeHashOptions } from '@common/computeHash'

export interface FileStorageOptions {
	/** 存储持有路径 */
	storagePath: string
	/** hash 计算配置选项, hash 算法需与切片的 hash 算法保持一致 */
	computeHashOptions?: ComputeHashOptions
}

export interface FileStorageInfo {
	/** 文件父级路径, 即文件所在目录路径 */
	parentPath: string
	/** 文件名(包含扩展名)或片段存储名 */
	name: string
	/** 文件或片段存储相对于存储根目录的路径 */
	relativeStoragePath: string
	/** 文件或片段存储在存储中的绝对路径 */
	absoluteStoragePath: string
}

export interface FragmentFileStorageInfo extends FileStorageInfo {
	/** 片段存储配置清单或分片任务配置清单的所在目录的绝对路径 */
	indexParentPath: string
	/** 片段存储配置清单或分片任务配置清单的名 */
	indexName: string
	/** 片段存储配置清单或分片任务配置清单的相对于存储根目录的路径 */
	relativeIndexPath: string
	/** 片段存储配置清单或分片任务配置清单的的绝对路径 */
	absoluteIndexPath: string
}

export interface SliceFileStorageInfo extends FragmentFileStorageInfo {}
