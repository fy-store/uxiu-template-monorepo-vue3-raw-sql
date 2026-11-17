// import type { PromiseReturn } from '@/api/utils'
// import type { CompleteMultipartResult, CreateSimpleSignatureResult } from '@server/api/v1/aliOSS'
// import { createAliOSSUploader } from '@/utils'
// import { aliOSS as aliOSSApi } from '@/api'

// /** 解包项目 API 响应，失败时交给上传任务统一处理。 */
// async function unwrapData<T>(response: PromiseReturn<T>) {
// 	const { code, msg, data } = await response
// 	if (code !== 0) throw new Error(msg)
// 	if (data === undefined) throw new Error('OSS 上传接口未返回数据')
// 	return data
// }

// /** 已接入项目后端 API 的 OSS 上传客户端。 */
// export const uploadOSS = createAliOSSUploader<CreateSimpleSignatureResult, CompleteMultipartResult>({
// 	createSimpleSignature: ({ signal, ...params }) => unwrapData(aliOSSApi.createSimpleSignature(params, signal)),
// 	prepareMultipart: ({ signal, ...params }) => unwrapData(aliOSSApi.prepareMultipart(params, signal)),
// 	listMultipartParts: async ({ uploadId, signal }) =>
// 		(await unwrapData(aliOSSApi.listMultipartParts({ uploadId }, signal))).parts,
// 	signMultipartParts: async ({ uploadId, partNumbers, signal }) =>
// 		(await unwrapData(aliOSSApi.signMultipartParts({ uploadId, partNumbers }, signal))).parts,
// 	completeMultipart: ({ uploadId, signal }) => unwrapData(aliOSSApi.completeMultipart({ uploadId }, signal)),
// 	abortMultipart: async ({ uploadId }) => {
// 		await unwrapData(aliOSSApi.abortMultipart({ uploadId }))
// 	}
// })
