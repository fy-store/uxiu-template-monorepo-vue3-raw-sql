import type { FileSliceManageWorkerMessage } from '../types'
import { Bus } from 'event-imt'

/**
 * Worker 与主线程通信
 */
export const bus = new Bus({
	events: {
		/**
		 * 发送 blob 的 hash 计算结果
		 * @param index blob 索引
		 * @param hash blob 的 hash 值
		 * @param blob blob 数据, blob 将被转移
		 */
		postBlobHash(index: number, hash: string, blob: Blob) {
			const data: FileSliceManageWorkerMessage = {
				type: 'blobHash',
				payload: {
					index,
					hash,
					blob
				}
			}
			self.postMessage(data)
		},

		/**
		 * 发送 blob 的加密结果
		 * @param index blob 索引
		 * @param encriptBlob blob 的加密数据
		 * @param originBlob 原始 blob 数据, blob 将被转移
		 */
		postEncriptBlob(index: number, encriptBuffer: ArrayBuffer, originBlob: Blob) {
			const data: FileSliceManageWorkerMessage = {
				type: 'encriptBlob',
				payload: {
					index,
					encriptBuffer,
					originBlob
				}
			}
			self.postMessage(data, {
				transfer: [encriptBuffer]
			})
		}
	}
})
