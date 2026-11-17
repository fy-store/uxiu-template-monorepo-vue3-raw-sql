---
name: uxiu-template-server
description: 在 uxiu-template monorepo 模板中开发或修改 Node.js/Koa 后端。用于 packages/server 下的 v1 API、路由注册与 404/405 排查、Zod schema、按模块导出的 API 类型、权限处理、数据库 DbFit 模块、SQL、文件存储、中间件和配置任务；要求遵循项目响应协议、接口仅使用 GET/POST 并按请求方法拆分、模块 Router 设置 prefix、数据库 schema 校验、软删除、参数化 SQL 与现有模块边界。
---

# Uxiu Template Server

先读取仓库根目录 `AGENTS.md`，再读取目标 API、数据库模块及其导出入口。优先沿用相邻模块的 alias 和请求体来源。

## 工作流程

1. 判断改动属于 API、数据库、common、utils、middleware 还是 config。
2. 新业务 API 使用目录模块组织：`schema.ts`（校验规则）、`types.ts`（接口类型）、按请求方法拆分的处理器文件，以及设置模块 `prefix` 并聚合子路由的 `index.ts`；仅使用 GET 与 POST。
3. 使用 Zod `safeParse` 校验参数，失败时返回 `defineCheckError(q.error)`。
4. 将数据库访问放入 `src/db/modules/<module>`，API 处理器只负责校验、权限、流程编排和响应。
5. 前端需要的 API 类型从各模块 `types.ts` 导出；后端入口不再统一导出类型，前端按具体模块路径 `@server/api/v1/<module>` 导入。
6. 新增受登录权限控制的 API 时，将真实请求方法和完整 v1 路径同步到 `src/config/authority/index.ts`；一个业务流程调用多个接口时逐个登记。
7. 检查事务、并发、软删除、文件系统清理和异常路径。
8. 修改路由后同时检查路由栈，并向当前监听端口发出真实 HTTP 请求；记录方法、最终 URL、状态码和响应体，区分代码问题、旧进程和前端配置问题。
9. 运行目标包可用的构建或类型检查，区分本次错误和仓库既有错误。

安装依赖必须使用 pnpm。遇到网络、超时或 registry 连接错误时，解除仓库根 `.npmrc` 中 `registry=https://registry.npmmirror.com` 的注释后重试；没有网络问题时保持注释，不自行添加其他镜像。

## 模块边界

- `src/utils`：不依赖系统配置和项目配置的后端工具。
- `src/common`：依赖 `sys` 或项目配置的共享实例和能力。
- `src/middleware`：Koa 请求链中间件，不放普通多模块工具。
- `src/config`：系统配置、数据库表定义、权限等项目配置。
- `src/db/modules`：数据库业务接口。
- `src/api` 与 `src/openApi`：系统 API 和开放 API。

## API 要求

- 每个 API 模块目录必须包含 `schema.ts`（Zod 校验规则）和 `types.ts`（通过 `z.infer` 推导的接口类型，供前端等其他使用方按模块路径导入）。
- 处理器按请求方法拆分文件，且仅使用 `get.ts` 与 `post.ts`，不使用 PUT/DELETE/PATCH 等方法：同一方法的路由注册在同一个文件，例如 `/login/user` 与 `/login/admin` 同为 POST，都放进 `post.ts`。
- 后端入口不再统一导出 API 类型（不在 `packages/server/src/index.ts` 或 `src/api/index.ts` 汇总），前端导入类型必须指向具体模块路径。
- 处理器文件导出自己的 `Router`，只注册模块内相对路径；模块 `index.ts` 创建 `Router` 时设置对应模块 `prefix`（如 `{ prefix: '/classify' }`），再用子路由的 `routes()` 聚合，并用 `export type * from './types'` 暴露本模块类型。
- `src/api/index.ts` 统一设置 `${sys.config.apiPath}/v1` 前缀并聚合各业务路由；`src/index.ts` 依次挂载顶层 `router.routes()` 和 `router.allowedMethods()`，再进入静态资源与 404 中间件。
- `allowedMethods()` 只在应用入口为顶层 API Router 挂载一次，不在子路由重复挂载。
- 根据相邻接口选择 `ctx.request.body`、`ctx.request.xssBody` 或 `ctx.query`。
- 成功响应使用 `{ code: 0, msg, data? }`；已知失败使用 `{ code: 1, msg }`。
- 处理器书写习惯统一沿用：解析结果命名 `q`（`const q = xxxSchema.safeParse(ctx.request.body)`，query 用 `ctx.query`）；失败立即 `ctx.body = defineCheckError(q.error)` 并 `return`；`const xxx = new DbXxx({ ctx })` 实例化数据库类，用 `q.data`（单字段用 `q.data.id`）传参，先 `await` 再响应。
- GET 请求 `ctx.query` 中的数字都是字符串，必须在 `schema.ts` 中用 `z.preprocess` 配合 `isEffectiveStrNumber` 显式转换为 `number` 并给出中文错误消息；可选数字字段把 `.optional()` 放在 `z.preprocess(...)` 之后。
- 不手写与现有响应、中间件或权限模块重复的逻辑。
- 密码、令牌、路径和权限处理必须复用 `@server/common`、`@server/utils` 或 `@server/config` 中已有能力。
- 权限树中的 `methods`、`path` 必须与路由注册完全一致；不要保留不存在的路由，也不要用一个入口权限代替工作流中的其他接口权限。
- 修改已有权限 ID 的方法或路径时，检查数据库中的序列化权限和登录会话是否会按 ID 刷新；不得只改静态权限树。

## 新增模块

- API 模块：创建或扩展 `src/api/v1/<module>`，同步 `schema.ts`、`types.ts`、按 GET/POST 拆分的处理器和带模块 `prefix` 的 `index.ts` 路由聚合。
- 数据库模块：放入 `src/db/modules/<module>`，必须包含 `schema.ts` 与 `types.ts`，从数据库聚合入口导出，API 不直接编写跨职责 SQL。
- 公共类型：从各 API 模块 `types.ts` 导出，前端按 `@server/api/v1/<module>` 具体路径导入；不在后端入口统一导出类型。
- 权限：逐项登记所有受保护路由，核对实际 HTTP 方法、`v1/` 路径、权限 ID 唯一性及管理员权限选择器展示。
- 权限兼容：新增权限默认不授予已有账号；修改已有权限规则时保留稳定 ID，并确保登录或迁移逻辑按当前配置重新序列化。
- 验证：搜索新模块名称确认注册、导出、权限和调用方完整；对当前运行服务发送匹配方法的真实请求，再运行 server 类型检查及受影响前端构建。

## 数据库要求

- 每个数据库模块目录必须包含 `schema.ts`（Zod 校验规则）和 `types.ts`（`z.infer` 推导的参数类型与返回实体）。
- 每个方法入口先 `schema.parse(p)` 校验参数，再执行 SQL。
- 类名使用 `DbXxx`，继承 `DbFit`。
- 参数为小驼峰；表字段为下划线；SELECT 使用别名转换为小驼峰。
- 使用 `:placeholder` 参数化查询，禁止拼接用户输入。
- 按语义使用 `'void'`、`'info'`、`'list'`、`'origin'`。
- 默认使用 `delete_time IS NULL` 和软删除，除非表或现有模块明确采用其他策略。
- JSON 字段写入前序列化，读取行为跟随适配器和相邻模块。

## 详细参考

实现 API 目录、Zod 查询参数、数据库 CRUD 或类型导出时，读取 [references/patterns.md](references/patterns.md)。
