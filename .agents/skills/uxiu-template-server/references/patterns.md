# 后端模式参考

## API 目录结构

API 模块目录必须包含 `schema.ts`（Zod 校验规则）和 `types.ts`（`z.infer` 推导类型），处理器按请求方法拆分文件，且仅使用 GET 与 POST：

```text
admin/
├── index.ts
├── schema.ts
├── types.ts
├── get.ts
└── post.ts
```

同一方法的所有路由注册在同一个文件，例如 `/login/user` 与 `/login/admin` 同为 POST，都放进 `post.ts`。处理器文件分别导出局部 Router，`index.ts` 负责导出类型、设置模块 `prefix` 并聚合子路由：

```ts
import { Router } from '@koa/router'
import { getAdminRouter } from './get'
import { postAdminRouter } from './post'

export type * from './types'

// 模块 Router 设置对应模块 prefix, 子路由只注册相对路径
export const adminRouter = new Router({ prefix: '/admin' })
adminRouter.use(getAdminRouter.routes(), postAdminRouter.routes())
```

后端入口不再统一导出 API 类型；前端按 `@server/api/v1/<module>` 具体模块路径导入类型。

## 新增业务模块检查清单

新增或拆分 API 模块时逐项确认：

1. `schema.ts` 定义输入校验，`types.ts` 通过 `z.infer` 导出参数类型，二者是模块必备文件。
2. 处理器按请求方法拆分到 `get.ts`/`post.ts`，仅使用 GET 与 POST，只负责校验、权限前置条件、流程编排和响应；数据访问进入对应 `DbXxx`。
3. 处理器文件导出局部 Router，模块 `index.ts` 创建 `Router` 时设置对应模块 `prefix`，用各子路由的 `routes()` 聚合，并通过 `export type * from './types'` 导出本模块类型。
4. `src/api/index.ts` 在顶层 Router 统一设置 v1 前缀并聚合业务路由；`packages/server/src/index.ts` 挂载 `routes()` 后紧接 `allowedMethods()`；不在后端入口统一导出 API 类型，前端按 `@server/api/v1/<module>` 导入。
5. `src/config/authority/index.ts` 登记每条受保护路由；方法和路径必须与处理器 Router 的方法、顶层 v1 前缀完全一致。
6. 同一前端操作调用准备、上传、合并等多个接口时，每个接口都需要独立权限规则。
7. 修改已有权限的方法或路径时保持权限 ID 稳定，并确认已存储规则会在登录时按 ID 映射到当前配置；新增权限仍由管理员显式授予。
8. 搜索模块名和请求路径，确认没有遗漏调用方、旧路由或失效权限项。

## API 处理器

按方法放入对应文件，例如 `post.ts`：

```ts
import { Router } from '@koa/router'
import { DbClassify } from '@server/db'
import { defineCheckError } from '@server/utils'
import { createClassifyParamsSchema, updateClassifyParamsSchema } from './schema'

export const postRouter = new Router()

postRouter.post('/create', async (ctx) => {
	const q = createClassifyParamsSchema.safeParse(ctx.request.body)
	if (!q.success) {
		ctx.body = defineCheckError(q.error)
		return
	}

	const classify = new DbClassify({ ctx })
	await classify.create(q.data)

	ctx.body = {
		code: 0,
		msg: '创建成功'
	}
})

postRouter.post('/update', async (ctx) => {
	const q = updateClassifyParamsSchema.safeParse(ctx.request.body)
	if (!q.success) {
		ctx.body = defineCheckError(q.error)
		return
	}

	const classify = new DbClassify({ ctx })
	const info = await classify.get(q.data.id)
	if (!info) {
		ctx.body = {
			code: 1,
			msg: '分类不存在'
		}
		return
	}

	await classify.update(q.data)

	ctx.body = {
		code: 0,
		msg: '更新成功'
	}
})
```

书写习惯（所有处理器保持一致）：

- 参数解析结果统一命名 `q`：body 用 `const q = xxxParamsSchema.safeParse(ctx.request.body)`，query 用 `ctx.query`。
- 校验失败立即 `ctx.body = defineCheckError(q.error)` 并 `return`，不再继续后续逻辑。
- 用 `const xxx = new DbXxx({ ctx })` 实例化数据库类，实例变量用小驼峰类名（如 `const classify = new DbClassify({ ctx })`、`const admin = new DbAdmin({ ctx })`），传入 `{ ctx }` 以复用数据库上下文、日志和事务能力。
- 传参使用 `q.data`；只取单个字段时用 `q.data.id`。
- 先 `await` 完成数据库操作，再构造响应。
- 成功返回 `{ code: 0, msg: 'xxx成功', data? }`；已知失败（如记录不存在）返回 `{ code: 1, msg: 'xxx不存在' }` 并 `return`。

顶层路由统一设置 API 前缀：

```ts
import { Router } from '@koa/router'
import path from 'node:path/posix'
import { sys } from '@server/config'
import { adminRouter } from './v1/admin'

export const router = new Router({
	prefix: path.join(sys.config.apiPath, 'v1')
})

router.use(adminRouter.routes())
```

## Schema 与类型

- 每个 API 模块必须同时提供 `schema.ts` 与 `types.ts`。
- Body 参数直接使用 `z.object`。
- API 参数类型通过 `z.infer<typeof schema>` 得出，避免手写重复类型。
- API 返回给前端的实体类型与数据库内部类型可以不同，避免暴露密码等字段。
- 前端从具体模块路径 `@server/api/v1/<module>` 复用这些 API 类型，不从后端入口统一导入。

### GET query 数字类型

GET 请求 `ctx.query` 中的参数都是字符串，数字类型字段必须在 `schema.ts` 中显式转换为 `number`，不能依赖处理器或数据库层隐式转换。使用 `z.preprocess` 配合 `isEffectiveStrNumber`（来自 `uxiu`）判断有效性，失败时通过 `ctx.addIssue` 给出中文错误消息；可选数字字段把 `.optional()` 放在 `z.preprocess(...)` 之后，避免空值进入预处理。

```ts
import { z } from 'zod'
import { isEffectiveStrNumber } from 'uxiu'

/** 必填数字, 如详情查询的 id */
export const getXxxInfoParamsSchema = z.object({
	id: z.preprocess(
		(v, ctx) => {
			if (!isEffectiveStrNumber(v as string)) {
				ctx.addIssue({ code: 'invalid_type', expected: 'int', message: 'ID 类型有误' })
			}
			return Number(v)
		},
		z.int('ID 必须是整数').min(1, 'ID 必须大于 0')
	)
})

/** 可选数字, 如分页 page/size */
export const getXxxListParamsSchema = z.object({
	page: z
		.preprocess(
			(v, ctx) => {
				if (!isEffectiveStrNumber(v as string)) {
					ctx.addIssue({ code: 'invalid_type', expected: 'int', message: '页码类型有误' })
				}
				return Number(v)
			},
			z.int('页码必须是整数').min(0, '页码必须大于等于 0')
		)
		.optional()
})
```

## 数据库模块

每个数据库模块目录必须包含 `schema.ts`（Zod 校验规则）和 `types.ts`（`z.infer` 推导的参数类型与返回实体），方法入口先 `schema.parse(p)` 再执行 SQL。参考 `packages/server/src/db/modules/admin`：

```ts
import type { CreateAdminParams } from './types'
import { createAdminParamsSchema } from './schema'

const admin = tableMap.admin

export class DbAdmin extends DbFit {
	create(p: CreateAdminParams) {
		const params = createAdminParamsSchema.parse(p)
		return this.query<void>(
			'void',
			/*sql*/ `
				INSERT INTO ${admin.tableName} (name, account)
				VALUES (:name, :account)
			`,
			params
		)
	}
}
```

约定：

1. `index.ts` 导出类并 `export * from './types'`。
2. `schema.ts` 放 Zod 校验规则，`types.ts` 放数据库参数和返回实体，参数类型由 `z.infer` 推导。
3. 每个方法入口先用对应 `schema.parse(p)` 校验参数。
4. 表定义从 `@server/config` 的 `tableMap` 获取。
5. 动态字段使用 `this.ifNotVoid` 或 `this.ifel`。
6. 分页将页码转换为 offset，沿用目标模块当前的 `page/size` 语义。
7. 布尔数据库字段返回后按需要转换为 boolean。
8. 敏感字段只在明确的 `allInfo` 或专用方法中查询。
9. 书写 sql 的关键字时使用大写, 字段命名以下划线分割单词, 返回给外部的字段使用小驼峰命名, sql 语句中保持合理缩进, 预计前方需使用 `/*sql*/` 注释。

## 文件与事务

- 数据库记录与物理文件同时变化时，先检查现有 `fileStorage` 和事务接口。
- 删除、合并分片和上传失败必须考虑部分成功后的清理。
- 文件返回或流响应不套 JSON 协议；普通接口统一使用 JSON。
- 处理用户路径时使用已有路径校验和文件存储封装。

## Import 选择

```ts
import { sys, tableMap } from '@server/config'
import { DbFileInfo } from '@server/db'
import { fileStorage, hash } from '@server/common'
import { defineCheckError, getWebURL } from '@server/utils'
import { Encryptor } from '@common/encryptor'
```

不要把依赖 `sys` 的能力放入 utils；不要把普通复用函数放进 middleware。

## 验证

先读取 `packages/server/package.json` 与根脚本，选择已有命令。若全仓类型检查有基线错误，至少完成：

- 目标文件的 TypeScript 诊断检查。
- 受影响 API 导出链检查。
- SQL 占位参数与参数对象逐项核对。
- 前端调用类型或构建检查（当 API 类型发生变化时）。

路由改动额外执行以下检查：

1. 检查顶层 Router 的 stack，确认目标方法和完整路径存在。
2. 确认当前端口对应的进程来自本工作区，并在路由改动后已经重载。
3. 使用与前端相同的方法、Origin、请求头和最终 URL 发出真实 HTTP 请求；跨域请求同时验证 `OPTIONS` 预检。
4. 根据响应体区分应用 404、权限拦截、反向代理或旧服务响应。仅看到 stack 中存在路由不能证明当前运行服务已经加载它。
