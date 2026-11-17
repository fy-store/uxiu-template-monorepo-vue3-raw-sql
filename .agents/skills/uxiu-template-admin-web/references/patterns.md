# 前端模式参考

## 目录职责

| 路径 | 用途 |
| --- | --- |
| `packages/admin-web/src/api` | Axios 请求函数和后端类型绑定 |
| `packages/admin-web/src/views` | 路由页面与业务模块 |
| `packages/admin-web/src/components` | 当前项目共享组件、hooks、指令 |
| `packages/admin-web/src/framework/hooks` | 可跨业务复用的框架 hook |
| `packages/admin-web/src/framework/components` | 框架内置组件 |
| `packages/admin-web/src/framework/core` | 框架底层，业务代码避免直接依赖 |
| `packages/admin-web/src/utils` | 无项目配置依赖的前端工具 |
| `packages/admin-web/src/config` | 项目配置、持久化键、常量 |

## 请求封装

参考 `packages/admin-web/src/api/fileInfo.ts`：

```ts
import { request, type PromiseReturn } from './utils'
import type { GetFileInfoListParams, FileInfo } from '@server/api/v1/fileInfo'

export function getFileInfoList(
	params: GetFileInfoListParams
): PromiseReturn<{ count: number; list: FileInfo[] }> {
	return request.get('/fileInfo/getList', { params })
}
```

业务调用保持项目响应协议：

```ts
const { code, msg, data } = await fileApi.getFileList(params)
if (code !== 0) {
	ElMessage.error(msg)
	list.value = []
	return
}

list.value = data?.list ?? []
```

新增接口时同时检查：

1. 后端是否已在对应模块 `types.ts` 导出 Zod 推导类型。
2. `packages/admin-web/src/api/index.ts` 是否需要导出模块。
3. GET 参数是否放在 `{ params }`，文件是否使用 `FormData`。

排查 404/405 时不要只看响应拦截器包装后的 `msg`。记录开发者工具中的 Request Method、Request URL、Status Code 和响应体，再逐项核对：

1. `.env.development` 或 `.env.production` 中的 `VITE_API_URL`。
2. Axios `baseURL` 与请求函数相对路径拼接出的最终 URL。
3. 后端顶层 Router 的 API/v1 前缀、处理器方法和相对路径。
4. 当前监听端口的进程是否来自本工作区，代码变更后是否已经重载。
5. 跨域请求的 `OPTIONS` 预检是否成功。

使用与浏览器相同的方法、Origin、请求头和请求体直接访问当前服务。直接请求成功而浏览器仍失败时，再检查代理、Service Worker 或浏览器缓存；不要重复修改已经可达的路由。

## Vue 模块

- 对话框、抽屉等子功能通常拆为同目录组件，并通过 `success` 事件刷新父列表。
- 表单使用 `useTemplateRef<FormInstance>` 或相邻文件既有方式。
- 列表页优先复用 `usePagination`、`useContextMenu`、`usePreviewFile` 等 framework hooks。
- Element Plus 的 `ElMessage`、`ElLoading` 等已自动导入；不要重复引入，除非类型需要。
- 前后端类型使用 `import type`。

新增页面业务模块时检查：

1. `src/views/<Module>` 中存在明确入口；复杂子功能按目录拆分，类型留在模块内部。
2. 对应 API 函数位于 `src/api`，并通过 `src/api/index.ts` 暴露给业务代码。
3. 父页面或路由已经导入模块，成功事件、列表刷新和卸载清理路径完整。
4. 后端类型已从对应模块 `@server/api/v1/<module>` 导出，工作流涉及的每个 API 都有匹配权限。

## 后端类型导入限制

- 前端只允许从后端导入类型，统一使用 `import type`；禁止 `import` 任何后端运行时代码，避免打包时把服务端依赖和源码带入前端。
- 类型必须指向具体模块路径 `@server/api/v1/<module>`，不从后端入口统一导入。
- 配置、常量等后端数据通过 HTTP 接口获取，不在前端导入后端配置模块或硬编码，避免源码泄漏并保证配置以后端为准。

## Framework Hook

参考 `packages/admin-web/src/framework/hooks/usePagination` 和 `usePreviewFile`：

- 目录以 `index.ts` 为入口。
- 类型放入 `types.ts`。
- 有 UI 时使用 `Template.vue`，由 hook 通过 `defineComponent`/`h` 或显式组件调用。
- 对外能力从 `packages/admin-web/src/framework/hooks/index.ts` 导出。
- 公共 hook 应提供 `README.md` 使用说明。
- 事件和异步资源由实例持有，并在组件卸载或 destroy 时释放。

## Worker 与大文件任务

- Worker 使用 `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })`。
- 主线程控制器负责生命周期和消息协议，Worker 文件负责重计算、流式处理或并发网络任务。
- 将消息类型放到独立 types 文件，主线程与 Worker 共用。
- 取消时中止全部 fetch、加解密器、FFmpeg、reader 和等待回调。
- 多分片任务优先复用 `@common/concurrencyControl`，结果按原始索引保存，再按顺序合并。
- 大文件优先流式读取/写入，避免不必要的全量复制；若封装阶段必须持有全部数据，要明确内存边界。

### 文件分片、加密与视频转码

`packages/admin-web/src/utils/fileSliceManage` 已封装分片 hash、分片加密和 MP4 转 DASH fMP4，业务层从 `@/utils` 导入 `FileSliceManage` 直接复用，不要重复实现：

- `computeFileHash(file, { chunkSize })`：按分片大小切分并多 Worker 计算分片 hash，再对分片 hash 串整体求 hash，返回 `hashInfoList` 与 `fileHash`。
- `encriptBlob` / `encriptBlobs` / `encriptSliceFromFile`：在 Worker 内并发加密；加密回调必须调用 `next()` 才会继续队列，否则 Promise 永不结束。
- `mp4ToDashFmp4(file, { segmentDuration, onProgress, onLog })`：用 ffmpeg.wasm 在浏览器本地转 DASH fMP4，先流拷贝，浏览器不支持编码或分片过长时自动重编码。
- `getVideoInfo(file)` / `isMp4File(file)`：读取时长与分辨率、判断是否 MP4。

约定：

- Worker 数量取 `min(分片数, navigator.hardwareConcurrency)`；任务按索引分发，结果按原始索引排序后合并。
- 主线程与 Worker 共用 `types.ts` 的消息类型，主线程消息在 `worker/index.ts` 分发；Worker 通过 `comm.ts` 的 bus 回传，加密后的 `ArrayBuffer` 用 transfer 转移。
- hash 与加密分别复用 `@common/computeHash`、`@common/encryptor`，不在业务层另写算法。
- ffmpeg core 从 `import.meta.env.BASE_URL + '/ffmpeg-core'` 加载本地 wasm；转码结束在 `finally` 中删除输入文件与输出目录，Worker 完成后 `terminate()`。
- 完整用法参考 `packages/admin-web/src/views/FileManage/encryptUpload.ts` 的整体加密、切片加密、视频加密三条上传路径。

## 通用模块导入

```ts
import { Encryptor } from '@common/encryptor'
import { concurrencyControl } from '@common/concurrencyControl'
import type { FileInfo } from '@server/api/v1/fileInfo'
import { omit } from 'uxiu/utils'
```

只有前端聚合入口已明确导出的工具才从 `@/utils` 或 `@/framework/hooks` 导入。

## 验证

```powershell
pnpm --dir packages/admin-web build-only
pnpm --dir packages/admin-web type-check
```

`type-check` 当前可能报告 common/server 或测试页面中的既有错误。确认目标文件没有新增诊断，并在结果中如实区分。
