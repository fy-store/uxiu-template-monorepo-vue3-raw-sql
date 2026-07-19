---
name: uxiu-template-web
description: 在 uxiu-template monorepo 模板中开发或修改 Vue 3 前端功能。用于 packages/web 下的视图、API 请求与 404/405 排查、组件、framework hooks、指令、工具、Worker、文件上传下载与预览任务；要求优先复用 Element Plus、UnoCSS、项目 hooks、@server 类型和 @common 通用模块，并保持现有代码风格。
---

# Uxiu Template Web

先读取仓库根目录 `AGENTS.md`，再检查目标文件相邻模块。以现有实现为准处理局部差异，不机械套用示例。

## 工作流程

1. 确定代码归属：
   - 页面业务放入 `packages/web/src/views/<Module>`。
   - 项目公共业务组件放入 `src/components`。
   - 可跨业务复用的框架能力放入 `src/framework`。
   - 无 UI 的项目工具放入 `src/utils`。
   - 请求封装放入 `src/api`，持久化键和项目常量放入 `src/config`。
2. 搜索已有 hook、组件、工具和 API，优先扩展或组合现有模块。
3. 从 `@server/index` 导入接口类型；从具体 `@common/<module>` 导入前后端通用能力。
4. 按相邻 Vue 文件的组织方式实现 template、`<script setup lang="ts">` 和 scoped 样式。
5. 处理异步任务的错误、取消、组件卸载和资源释放；Worker、对象 URL、事件监听器必须有明确清理路径。
6. 新模块调用后端受保护 API 时，确认 server 已为工作流中的每个请求登记权限。
7. 排查请求错误时记录 Axios 的 `baseURL`、相对路径、HTTP 方法和浏览器最终 URL，并用同样的请求验证当前后端进程；不要只根据封装后的错误消息判断路由状态。
8. 运行最窄验证，再运行 `pnpm --dir packages/web build-only`。类型检查失败时区分本次诊断和仓库既有诊断。

## 编码要求

- 使用 TypeScript、ESModule、`async/await`、无分号风格和 tab 缩进。
- 顶级函数使用 `function`；回调和非顶级函数优先箭头函数。
- 对导出的函数、复杂函数和 hook 公共接口使用文档注释。
- Element Plus 组件和常用 API 已自动导入；图标使用 `<i-ep-名称 class="f-12" />`。
- 样式优先使用现有 UnoCSS 原子类；只有组件专属复杂样式才写 scoped SCSS。
- 使用 uxiu 工具时从 `uxiu/utils` 导入，避免从不兼容入口导入。
- 新模块使用目录加 `index.ts|vue` 入口；单文件接近 600 行时按职责拆分。

## API 对接

- API 层返回 `PromiseReturn<T>`，业务层解构 `{ code, msg, data }`。
- `code !== 0` 时展示错误并决定是否清空状态或提前返回。
- 获取列表时为缺省数据提供明确回退；不要用非空断言掩盖可能缺失的数据，除非接口成功契约已经保证。
- 上传文件使用 `FormData`，沿用现有进度回调格式。
- 404/405 排查必须同时核对 `.env.*` 中的 `VITE_API_URL`、请求函数的相对路径、后端路由前缀和真实请求方法；跨域请求还要检查 `OPTIONS` 预检。

## 新增模块

- 页面业务创建 `src/views/<Module>`；多文件模块使用目录和 `index.vue` 入口，局部类型放同目录 `types.ts`。
- 请求函数放入 `src/api/<module>.ts`，并检查 `src/api/index.ts` 的命名空间导出。
- 参数和返回类型优先从 `@server/index` 导入，不在前端重复声明后端协议。
- 在父页面、路由或 framework 聚合入口完成实际接入；仅创建文件但没有入口不算完成。
- 一个操作包含准备、上传、合并等多个请求时，逐项核对后端权限配置和错误处理。
- 完成后搜索模块名确认入口与调用方，运行类型检查和生产构建。

## 详细参考

处理目录选择、hook 结构、请求封装、Worker 或验证命令时，读取 [references/patterns.md](references/patterns.md)。
