import { computeBlobHash } from './computeHash'
import { encriptBlob } from './encriptBlob'
import type { PostMessageToWorker } from '../types'

self.onmessage = async (event) => {
	const data: PostMessageToWorker = event.data
	if (data.type === 'computeHash') {
		computeBlobHash(data.payload.index, data.payload.blob)
		return
	}

	if (data.type === 'encriptBlob') {
		encriptBlob(data.payload.index, data.payload.blob, data.payload.key)
		return
	}
}
