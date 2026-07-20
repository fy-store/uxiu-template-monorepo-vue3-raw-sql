# Uxiu Template Monorepo

## 项目概述

这是一个使用 pnpm 管理的 TypeScript monorepo，要求 Node.js `>= 24`, MySQL `>= 8.0`, 启动请参考 `README.md` 中的启动和部署须知。

| 路径              | 职责                       |
| ----------------- | -------------------------- |
| `packages/web`    | Vue 3 Web 前端             |
| `packages/server` | Koa 3 服务端               |
| `packages/common` | 前后端通用 TypeScript 模块 |

## 项目 Skills

前端、后端和通用模块的目录职责、编码模式、项目封装与验证方式维护在 `.agents/skills` 中。根据任务范围使用对应 skill；跨包任务同时使用所有相关 skill。

根文件只维护仓库全局信息，不重复 skill 中已有的领域规范。

## 工作要求

- 开始前检查目标文件、相邻实现、导出入口、调用方和 `git status`。
- 优先复用现有模块，不重复实现相同能力。
- 保持改动聚焦，不重构无关代码，不覆盖工作区中的已有修改。
- 安装依赖和执行包脚本统一使用 pnpm。
- 使用 pnpm 安装依赖遇到网络、超时或 registry 连接错误时，解除根 `.npmrc` 中 `registry=https://registry.npmmirror.com` 的注释后重试；没有网络问题时保持注释，不自行添加其他镜像。
- 修改跨包公开类型或接口时，同步检查所有消费方。
- 修改 API 路由时，核对前缀、HTTP 方法、权限配置和前端最终 URL；路由栈检查不能替代对当前运行服务的真实 HTTP 请求验证。
- 验证范围与改动风险匹配；区分本次错误与仓库既有错误。
- 完成后运行 `git diff --check`，确认没有空白错误或临时文件。

## 常用命令

```powershell
pnpm dev
pnpm dev:web
pnpm dev:server
pnpm build
```

数据库初始化、超级管理员初始化和密钥生成命令会改变本地状态，仅在用户明确要求时运行。
