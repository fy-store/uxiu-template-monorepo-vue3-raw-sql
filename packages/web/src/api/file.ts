import { request, type PromiseReturn } from './utils'
import type { AxiosProgressEvent } from 'axios'
import type { UploadFileParams } from '@server/index'

export function uploadFile(
	file: File,
	params: UploadFileParams,
	onProgress?: (percent: number) => void
): PromiseReturn {
	const formData = new FormData()
	formData.append('file', file)
	for (const key in params) {
		const value = (params as any)[key]
		if (value !== void 0) {
			formData.append(key, value)
		}
	}

	return request.post('uploadFile', formData, {
		onUploadProgress: (event: AxiosProgressEvent) => {
			if (!onProgress) {
				return
			}

			const total = event.total ?? file.size
			if (!total) {
				return
			}

			onProgress(Math.min(100, Math.max(0, Math.round((event.loaded / total) * 100))))
		}
	})
}
