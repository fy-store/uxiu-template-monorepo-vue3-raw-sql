// import { request, type PromiseReturn } from '@/api/utils'
// import type {
// 	AbortMultipartResult,
// 	MultipartSessionParams,
// 	CompleteMultipartResult,
// 	CreateSimpleSignatureParams,
// 	CreateSimpleSignatureResult,
// 	ListMultipartPartsResult,
// 	PrepareMultipartParams,
// 	PrepareMultipartResult,
// 	SignFragmentUploadParams,
// 	SignFragmentUploadResult,
// 	SignMultipartPartsParams,
// 	SignMultipartPartsResult
// } from '@server/api/v1/aliOSS'

// /** 永久取消 OSS 分片上传并清理会话。 */
// export function abortMultipart(params: MultipartSessionParams, signal?: AbortSignal) {
// 	return request.post('/aliOSS/multipart/abort', params, { signal }) as PromiseReturn<AbortMultipartResult>
// }

// /** 校验并完成 OSS 分片上传。 */
// export function completeMultipart(params: MultipartSessionParams, signal?: AbortSignal) {
// 	return request.post('/aliOSS/multipart/complete', params, { signal }) as PromiseReturn<CompleteMultipartResult>
// }

// /** 获取普通 PUT 上传预签名。 */
// export function createSimpleSignature(params: CreateSimpleSignatureParams, signal?: AbortSignal) {
// 	return request.post('/aliOSS/simple/sign', params, { signal }) as PromiseReturn<CreateSimpleSignatureResult>
// }

// /** 获取 OSS 中已存在的上传分片。 */
// export function listMultipartParts(params: MultipartSessionParams, signal?: AbortSignal) {
// 	return request.post('/aliOSS/multipart/listParts', params, { signal }) as PromiseReturn<ListMultipartPartsResult>
// }

// /** 创建或恢复 OSS 分片上传会话。 */
// export function prepareMultipart(params: PrepareMultipartParams, signal?: AbortSignal) {
// 	return request.post('/aliOSS/multipart/prepare', params, { signal }) as PromiseReturn<PrepareMultipartResult>
// }

// /** 为缺失分片生成 PUT 预签名。 */
// export function signMultipartParts(params: SignMultipartPartsParams, signal?: AbortSignal) {
// 	return request.post('/aliOSS/multipart/signParts', params, { signal }) as PromiseReturn<SignMultipartPartsResult>
// }

// /** 为同一目录下的多个片段批量生成 PUT 预签名。 */
// export function signFragmentUpload(params: SignFragmentUploadParams, signal?: AbortSignal) {
// 	return request.post('/aliOSS/fragment/sign', params, { signal }) as PromiseReturn<SignFragmentUploadResult>
// }
