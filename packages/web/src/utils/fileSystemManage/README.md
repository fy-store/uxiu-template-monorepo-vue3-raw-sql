# fileSystemManage

`FileSystemManage` 封装 File System Access API，用于在用户授权的目录中读取、写入和管理文件。

## 选择目录

```ts
import { FileSystemManage, selectDir } from '@/utils/fileSystemManage'

const dirHandle = await selectDir({
	id: 'download-directory',
	mode: 'readwrite'
})
const fileSystemManage = new FileSystemManage(dirHandle)
```

## 读取所选目录内容

```ts
const snapshot = await fileSystemManage.getTreeSnapshot()
```

所选目录自身不会进入快照。快照中的 `directories` 包含全部子目录和空子目录；`files` 包含文件对象及其相对于所选目录内部的路径。

例如选择 `手机` 目录后，`手机/a.jpg` 的快照路径为 `a.jpg`，`手机/照片/b.jpg` 的快照路径为 `照片/b.jpg`。

拖拽目录使用同一结构：

```ts
import { FileSystemManage } from '@/utils/fileSystemManage'

const snapshot = await FileSystemManage.getDroppedDirectoryTree(event.dataTransfer)
```

拖拽读取仅接受目录，支持一个或多个顶层目录；各顶层目录自身不进入快照，其内部层级和空子目录会被保留。

## 流式读取

```ts
const stream = await fileSystemManage.readFileStreamByName('video.mp4')
const nestedStream = await fileSystemManage.readFileStreamByPath('videos/video.mp4')
```

`readFileStreamByName` 支持传入 `FileSystemGetFileOptions` 和指定目录句柄。

## 流式写入

```ts
const response = await fetch('/storage/public/video.mp4?download=inline')
if (!response.body) {
	throw new Error('当前浏览器不支持流式下载')
}

await fileSystemManage.writeFileFromStream('video.mp4', response.body)
```

也可以通过路径或已有文件句柄写入：

```ts
await fileSystemManage.writeFileByPathFromStream('videos/video.mp4', response.body)

const fileHandle = await dirHandle.getFileHandle('video.mp4', { create: true })
await fileSystemManage.writeFileStreamByHandle(fileHandle, response.body)
```

流式写入会逐块消费 `ReadableStream`。写入失败时会终止文件写入并继续抛出原始错误。

## 浏览器要求

File System Access API 主要由 Chromium 浏览器支持，通常要求页面运行在 HTTPS 或 localhost 安全上下文中。
