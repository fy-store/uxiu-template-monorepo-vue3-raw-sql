# usePreviewFile

`usePreviewFile` 通过全局弹窗预览文件，支持图片、视频、PDF、文本、未知类型下载，以及普通加密文件和 DASH 片段视频的解密预览。

## 支持类型

| 类型 | 扩展名 |
| --- | --- |
| 图片 | `.png`、`.jpg`、`.jpeg`、`.gif`、`.webp`、`.bmp`、`.svg` |
| 视频 | `.mp4`、`.webm`、`.ogg` |
| PDF | `.pdf` |
| 文本 | `.txt`、`.md`、`.json`、`.xml`、`.html`、`.css`、`.js`、`.ts`、`.vue`、`.yaml` 等 |
| 其他 | 显示下载入口 |

解密文件还会根据 `initDecrypt` 设置的 MIME 类型辅助判断预览类型。

## 下载方式

预览弹窗顶部提供以下操作：

| 操作 | 说明 |
| --- | --- |
| `原始下载` | 下载服务端原始文件；加密文件完成解密前为禁用状态 |
| `解密下载` | 解密后下载文件，仅加密文件显示 |
| `解密预览` | 解密并继续在弹窗中预览，仅未解密文件显示 |

下载方式选择器支持：

| 下载方式 | 说明 |
| --- | --- |
| `普通下载` | 默认方式；Worker 下载并合并文件后，由主线程使用 `a` 元素触发 Blob 下载 |
| `下载到文件夹` | 选择本地目录后，Worker 使用 `FileSystemManage` 将响应流或逐片解密后的数据流持续写入文件 |

“下载到文件夹”依赖 File System Access API，建议使用 Chrome 或 Edge，并在安全上下文中运行。

用户选择的下载方式会写入 `localStorage`，再次打开预览窗口时自动恢复。持久化键统一声明在 `@/config/persistence` 的 `persistenceKeys` 中，业务模块不应自行硬编码键名。

## 下载任务

原始下载和解密下载均由独立 Worker 执行，主线程仅负责目录授权、任务控制和最终触发浏览器下载。下载期间顶部会展示百分比进度，并提供以下操作：

| 操作 | 说明 |
| --- | --- |
| `暂停` | 暂停继续读取网络响应和写入文件 |
| `继续` | 从当前任务进度继续下载 |
| `取消` | 中止网络请求、解密和文件写入 |

单文件下载优先根据响应 `Content-Length` 计算进度；片段文件按片段数量和当前片段进度综合计算。服务端没有提供内容长度时，单文件进度可能在完成前保持为 `0%`。

解密预览与解密下载使用独立任务，下载期间可以继续解密或播放预览，预览处理期间也可以启动下载。下载完成后不会关闭预览窗口。

加密 DASH 视频下载时，下载 Worker 会先读取并解密 MPD、初始化片段和媒体片段，再通过 ffmpeg Worker 将分离的音视频轨道重新封装为标准 MP4，避免直接拼接片段产生不可播放文件。

## 基础用法

```ts
import { usePreviewFile } from '@/framework/hooks/usePreviewFile'

const previewFile = usePreviewFile()

function openFile() {
	previewFile.preview({
		url: '/api/file/download/1',
		name: '示例',
		ext: '.pdf'
	})
}
```

同一个实例再次调用 `preview` 时，会先关闭并清理上一次预览。

## 配置项

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `url` | `string` | 是 | 原始文件 URL；片段文件时为片段目录 URL |
| `name` | `string` | 是 | 展示文件名，通常不包含扩展名 |
| `ext` | `string` | 是 | 含点扩展名，如 `.mp4` |
| `isFragment` | `boolean` | 否 | 是否采用片段目录存储 |
| `isEncrypted` | `boolean` | 否 | 是否需要密码解密 |
| `meta` | `string` | 否 | 业务侧保存的加密元信息 |
| `customClass` | `string \| object \| string[]` | 否 | 预览弹窗自定义类名 |
| `file` | `File` | 否 | 本地文件，预留给上传预览场景 |
| `password` | `string` | 否 | 预设密码，仅初始化解密状态；常规场景建议通过密码弹窗执行完整解密 |
| `initDecrypt` | `(ctx) => void \| Promise<void>` | 否 | 解密前解析元信息并设置文件信息 |

## 返回值与事件

```ts
const previewFile = usePreviewFile()

previewFile.bus.on('preview', (vnode) => {
	console.log('vnode -> ', vnode)
})

previewFile.bus.on('close', () => {
	console.log('preview -> ', 'closed')
})

previewFile.close()
```

| 字段 | 说明 |
| --- | --- |
| `bus` | `preview`、`close` 事件总线 |
| `preview(options)` | 打开文件预览 |
| `close()` | 主动关闭并卸载预览 |

主动调用 `close()` 只执行资源清理；当前实现的 `close` 事件由预览弹窗自身关闭时触发。

## 加密文件

`initDecrypt` 用于解密业务侧的 `meta`，并把真实名称、扩展名、MIME 类型或视频清单写回预览组件。文件内容本身由模块内部的 Worker 使用项目 `Encryptor` 解密。

```ts
import { Encryptor } from '@common/encryptor'
import type { InitDecryptContext } from '@/framework/hooks/usePreviewFile'

previewFile.preview({
	url: file.url,
	name: file.name,
	ext: file.ext,
	isEncrypted: true,
	meta: file.meta,
	async initDecrypt(ctx: InitDecryptContext) {
		if (!file.meta) return

		const encryptor = new Encryptor({ key: ctx.password })
		const metadata = JSON.parse(await encryptor.decryptText(file.meta))

		if (metadata.name) ctx.setName(metadata.name)
		if (metadata.ext) {
			ctx.setExt(metadata.ext.startsWith('.') ? metadata.ext : `.${metadata.ext}`)
		}
		if (metadata.mimeType) ctx.setMimeType(metadata.mimeType)
		if (metadata.videoManifest) ctx.setVideoManifest(metadata.videoManifest)
	}
})
```

`InitDecryptContext` 提供以下方法：

| 方法 | 说明 |
| --- | --- |
| `setName(name)` | 设置解密后的展示名称 |
| `setExt(ext)` | 设置解密后的含点扩展名 |
| `setMimeType(mime)` | 设置解密后的 MIME 类型 |
| `setIsFragment(value)` | 设置片段标记；当前预览流程以接口参数为准 |
| `setVideoManifest(manifest)` | 设置 DASH 清单索引、时长、尺寸和片段数量 |

## 片段视频

片段目录至少需要提供：

```text
folder/
  index.json
  manifest.mpd
  init segment
  media segments
```

`index.json` 必须包含 `indexList`。片段视频还需要通过 `setVideoManifest` 提供 `manifestIndex`，播放器会读取并修正 MPD 内的片段地址，再通过自定义 Shaka Player scheme 按需获取或解密片段。

```ts
previewFile.preview({
	url: '/files/video-folder',
	name: 'video',
	ext: '.mp4',
	isFragment: true,
	isEncrypted: true,
	meta: encryptedMeta,
	async initDecrypt(ctx) {
		const encryptor = new Encryptor({ key: ctx.password })
		const metadata = JSON.parse(await encryptor.decryptText(encryptedMeta))

		ctx.setVideoManifest(metadata.videoManifest)
	}
})
```

当前 `PreviewOptions` 没有独立的 `manifestIndex` 参数，因此无加密片段视频也需要由业务侧确认清单索引的传递方式后再接入。

## 资源清理

- 普通加密文件生成的 Blob URL 会在弹窗关闭或组件卸载时释放。
- 解密 Worker 会在预览关闭时终止，等待中的任务会被取消。
- 下载 Worker 会在任务完成、异常、取消、预览开始关闭或组件卸载时终止；关闭时会先取消网络、解密与 ffmpeg 子 Worker，再由超时机制兜底强制终止。
- 预览请求绑定 AbortController，关闭窗口会取消尚未完成的索引、文件和视频片段请求，避免异步返回后重新创建 Worker。
- 视频播放器会在组件卸载或视频源变化时销毁。
- 片段播放器内部最多缓存 16 个片段请求。

## 文件响应参数

公共和私有文件 URL 支持以下查询参数：

| 参数 | 可选值 | 说明 |
| --- | --- | --- |
| `name` | 文件名 | 指定 `Content-Disposition` 中的下载文件名；未带扩展名时沿用请求文件扩展名 |
| `download` | `attachment`、`inline` | 指定下载或浏览器内预览 |

```text
/storage/public/example.pdf?name=report.pdf&download=attachment
/storage/public/example.pdf?name=report.pdf&download=inline
```
