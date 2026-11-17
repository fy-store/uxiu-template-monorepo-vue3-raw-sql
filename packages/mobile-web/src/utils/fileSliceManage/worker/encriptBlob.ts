import { bus } from './comm'
import { Encryptor } from '@common/encryptor'

/**
 * 计算 blob 的 hash 值
 * @param index blob 索引
 * @param index blob 索引
 * @param blob blob 数据
 */
export async function encriptBlob(index: number, blob: Blob, key: string) {
	const encryptor = new Encryptor({ key })
	const encriptBuffer = await encryptor.encryptArrayBuffer(await blob.arrayBuffer())
	bus.emit('postEncriptBlob', index, encriptBuffer, blob)
}
