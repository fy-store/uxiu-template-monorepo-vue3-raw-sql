import { bus } from './comm'
import { ComputeHash } from '@common/computeHash'

/**
 * 计算 blob 的 hash 值
 * @param index blob 索引
 * @param index blob 索引
 * @param blob blob 数据
 */
export async function computeBlobHash(index: number, blob: Blob) {
	const computeHash = new ComputeHash()
	const hash = await computeHash.getHashFromBlob(blob)
	bus.emit('postBlobHash', index, hash, blob)
}
