# 前端模式参考

## 目录职责

| 路径 | 用途 |
| --- | --- |
| `packages/web/src/api` | Axios 请求函数和后端类型绑定 |
| `packages/web/src/views` | 路由页面与业务模块 |
| `packages/web/src/components` | 当前项目共享组件、hooks、指令 |
| `packages/web/src/framework/hooks` | 可跨业务复用的框架 hook |
| `packages/web/src/framework/components` | 框架内置组件 |
| `packages/web/src/framework/core` | 框架底层，业务代码避免直接依赖 |
| `packages/web/src/utils` | 无项目配置依赖的前端工具 |
| `packages/web/src/config` | 项目配置、持久化键、常量 |

## 请求封装

参考 `packages/web/src/api/file.ts`：

```ts
import { request, type PromiseReturn } from './utils'
import type { GetFileListParams, FileInfo } from '@server/index'

export function getFileList(params: GetFileListParams): PromiseReturn<{ count: number; list: FileInfo[] }> {
	return request.get('getFileList', { params })
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

1. 后端是否已经导出 Zod 推导类型。
2. `packages/web/src/api/index.ts` 是否需要导出模块。
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
4. 后端公开类型已从 `@server/index` 导出，工作流涉及的每个 API 都有匹配权限。

## Framework Hook

参考 `packages/web/src/framework/hooks/usePagination` 和 `usePreviewFile`：

- 目录以 `index.ts` 为入口。
- 类型放入 `types.ts`。
- 有 UI 时使用 `Template.vue`，由 hook 通过 `defineComponent`/`h` 或显式组件调用。
- 对外能力从 `packages/web/src/framework/hooks/index.ts` 导出。
- 公共 hook 应提供 `README.md` 使用说明。
- 事件和异步资源由实例持有，并在组件卸载或 destroy 时释放。

## Worker 与大文件任务

- Worker 使用 `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })`。
- 主线程控制器负责生命周期和消息协议，Worker 文件负责重计算、流式处理或并发网络任务。
- 将消息类型放到独立 types 文件，主线程与 Worker 共用。
- 取消时中止全部 fetch、加解密器、FFmpeg、reader 和等待回调。
- 多分片任务优先复用 `@common/concurrencyControl`，结果按原始索引保存，再按顺序合并。
- 大文件优先流式读取/写入，避免不必要的全量复制；若封装阶段必须持有全部数据，要明确内存边界。

## 通用模块导入

```ts
import { Encryptor } from '@common/encryptor'
import { concurrencyControl } from '@common/concurrencyControl'
import type { FileInfo } from '@server/index'
import { omit } from 'uxiu/utils'
```

只有前端聚合入口已明确导出的工具才从 `@/utils` 或 `@/framework/hooks` 导入。

## 验证

```powershell
pnpm --dir packages/web build-only
pnpm --dir packages/web type-check
```

`type-check` 当前可能报告 common/server 或测试页面中的既有错误。确认目标文件没有新增诊断，并在结果中如实区分。
