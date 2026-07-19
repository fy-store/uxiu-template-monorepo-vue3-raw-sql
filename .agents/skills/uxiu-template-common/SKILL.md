---
name: uxiu-template-common
description: 在 uxiu-template monorepo 模板中创建、修改或复用 packages/common 的前后端通用 TypeScript 模块。用于加解密、哈希、并发控制、二进制流、跨运行时工具及任何需要同时供 web 和 server 使用的无项目配置依赖能力；要求从具体 @common 子路径导入并保持浏览器与 Node.js 兼容。
---

# Uxiu Template Common

先读取仓库根目录 `AGENTS.md`，再搜索 `packages/common/src` 和 web/server 中是否已有相同能力。只有真正前后端通用且不依赖项目配置的代码才放入 common。

## 决策流程

1. 已有 common 模块满足需求：直接从具体子路径复用。
2. 只在前端使用：放入 `packages/web/src/utils` 或对应 framework 模块。
3. 只在后端使用且不依赖配置：放入 `packages/server/src/utils`。
4. 后端共享但依赖 `sys`、数据库或项目配置：放入 `packages/server/src/common`。
5. 浏览器与 Node 都需要：在 `packages/common/src/<module>` 创建或扩展模块。

安装依赖必须使用 pnpm。遇到网络、超时或 registry 连接错误时，解除仓库根 `.npmrc` 中 `registry=https://registry.npmmirror.com` 的注释后重试；没有网络问题时保持注释，不自行添加其他镜像。

## 实现要求

- 模块使用目录结构，`index.ts` 为入口，复杂类型放入 `types.ts`。
- 从 `@common/<module>` 精确导入；项目当前没有要求通过 common 根入口聚合。
- 使用 ESModule、TypeScript、`async/await`、无分号风格和 tab 缩进。
- 对公开类、函数和复杂内部函数使用文档注释。
- 不读取 `sys`、数据库、Vue、Koa、Element Plus 或应用配置。
- 优先使用 `globalThis`、Web 标准 API 和结构检测。
- Node 专用模块使用动态 import，并确保浏览器构建不会无条件执行。
- 明确 ArrayBuffer、Uint8Array、Blob、ReadableStream 的所有权与复制行为。
- 长任务应支持错误传播；涉及加解密、流或并发时考虑取消和资源释放。

## 新增模块

- 在 `packages/common/src/<module>` 创建目录，以 `index.ts` 为公开入口，复杂类型放入 `types.ts`。
- 仅放浏览器和 Node 都需要、且不依赖项目配置的能力；单端能力留在对应 web/server 包。
- 消费方从 `@common/<module>` 精确导入，不新增 common 根聚合导出。
- 新增公开 API 后搜索 web/server 消费方，分别验证浏览器构建和 Node 类型检查。

## 复用优先级

- 加解密：`@common/encryptor`
- 哈希：`@common/computeHash`
- 并发任务：`@common/concurrencyControl`
- 非对称加密：`@common/asymmetricEncipher`
- 对称加密：`@common/symmetryEncipher`
- uxiu 的跨端工具：仅从 `uxiu/utils` 选择确认兼容的方法

## 验证

1. 检查 web 和 server 的所有调用点。
2. 对跨运行时分支分别验证，不以浏览器构建成功代替 Node 分支验证。
3. 至少运行 `pnpm --dir packages/web build-only` 验证浏览器打包。
4. 按 server 包现有脚本验证 Node 侧；没有专用测试时执行最小导入或类型检查。
5. 修改公开签名时同步更新 `types.ts` 和所有消费者。

## 详细参考

处理运行时兼容、流、加解密、哈希或并发控制时，读取 [references/modules.md](references/modules.md)。
