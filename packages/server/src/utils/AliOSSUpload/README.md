# AliOSSUpload 服务端上传管理器

`AliOSSUploadManager` 在 `AliOSS` 预签名能力之上统一封装。所有会话存储适配器方法都是异步 Promise，管理器会逐项 `await`，可以直接接入数据库或 Redis：

- 普通 PUT 上传签名
- Multipart Upload 初始化
- 上传会话和用户归属
- 分片 URL 批量签名
- OSS `ListParts` 可信校验
- 完成合并和临时访问 URL
- 永久取消及残留分片清理
- 可替换的数据库、Redis 或内存会话存储

## 快速创建

```ts
import { AliOSS, AliOSSUploadManager, AliOSSUploadMemoryStorage } from '@server/utils'

const oss = new AliOSS({
	accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
	accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
	bucket: 'example-bucket',
	region: 'oss-cn-hangzhou'
})

export const uploadManager = new AliOSSUploadManager<number>({
	oss,
	storage: new AliOSSUploadMemoryStorage<number>(),
	simpleUploadPath: ({ ownerId }) => `users/${ownerId}/simple`,
	multipartUploadPath: ({ ownerId }) => `users/${ownerId}/multipart`,
	signatureExpires: 15 * 60,
	accessExpires: 60 * 60
})
```

其中泛型 `number` 是业务中的用户 ID 类型，也可以替换成 `string` 或其他稳定标识类型。

## API 中调用

业务 API 负责参数校验、登录权限和响应协议，上传管理器负责 OSS 流程：

```ts
const ownerId = ctx.identitySessionInfo!.info.id

const signature = await uploadManager.createSimpleUploadSignature(ownerId, {
	filename,
	fileSize,
	contentType
})

const prepared = await uploadManager.prepare(ownerId, {
	filename,
	fileSize,
	contentType,
	lastModified,
	partSize,
	resumeKey
})

const parts = await uploadManager.listParts(ownerId, uploadId)
const signedParts = await uploadManager.signParts(ownerId, uploadId, partNumbers)
const completed = await uploadManager.complete(ownerId, uploadId)
const aborted = await uploadManager.abort(ownerId, uploadId)
```

`complete()` 会重新向 OSS 查询全部分片，校验编号、数量和大小后才允许合并，不信任前端提交的 ETag。

## 持久化存储

内存存储只适合开发。生产环境实现 `AliOSSUploadSessionStorage` 即可：

```ts
import type { AliOSSUploadSessionStorage } from '@server/utils'

export class DatabaseUploadStorage implements AliOSSUploadSessionStorage<number> {
	getByUploadId(ownerId: number, uploadId: string) {
		return db.findUpload({ ownerId, uploadId })
	}

	getByResumeKey(ownerId: number, resumeKey: string) {
		return db.findUpload({ ownerId, resumeKey })
	}

	async save(session) {
		await db.upsertUpload(session)
	}

	async delete(session) {
		await db.deleteUpload(session.ownerId, session.uploadId)
	}
}
```

数据库应为 `(ownerId, resumeKey)` 建立唯一约束，并定时清理长期未完成的 Multipart Upload。调用 `abort()` 清理 OSS 后再删除业务会话。

## 错误类型

- `AliOSSUploadSessionNotFoundError`：会话不存在、已经结束或不属于当前用户。
- `AliOSSUploadSessionConflictError`：续传标识与文件冲突，或 OSS 实际分片不完整。
- `RangeError`：分片编号超出当前文件范围。
