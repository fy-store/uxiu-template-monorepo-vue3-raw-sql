# 项目简介

这是一个 monorepo 项目, 更多文档正在编写中

**前端**:

- `vue3`

- `pinia`

- `vue-router`

- `element-plus`

- `axios`

- `typescript`

**后端**:

- `koa`

- `mysql(raw sql 若需 ORM 请自行安装)`

- `typescript`

## 安装依赖

```bash
pnpm i
```

## 初始化 mysql

1. 进入 packages/server 目录下

2. 执行 `pnpm init:root`

## 启动项目

```bash
pnpm dev
# or
npm dev
```

## 打包项目

```bash
pnpm build
# or
npm build
```

## 更多命令

请查看 `package.json` `packages/server/package.json` or `packages/web/package.json` 中的 `scripts`
