# 后端模式参考

## API 目录结构

参考 `packages/server/src/api/v1/admin`：

```text
admin/
├── index.ts
├── schema.ts
├── types.ts
├── createAdmin.ts
├── getAdminList.ts
├── updateAdmin.ts
└── deleteAdmin.ts
```

`index.ts` 负责导出类型并通过副作用导入注册处理器：

```ts
export type * from './types'
import './createAdmin'
import './getAdminList'
import './deleteAdmin'
import './updateAdmin'
```

## 新增业务模块检查清单

新增或拆分 API 模块时逐项确认：

1. `schema.ts` 定义输入校验，`types.ts` 通过 `z.infer` 导出参数类型。
2. 处理器只负责校验、权限前置条件、流程编排和响应；数据访问进入对应 `DbXxx`。
3. 模块 `index.ts` 使用副作用导入注册每个处理器，并导出前端需要的类型。
4. 上级 API 聚合入口和 `packages/server/src/index.ts` 能导出公开类型。
5. `src/config/authority/index.ts` 登记每条受保护路由；方法和路径必须与 `sys.routerV1.get/post/...` 完全一致。
6. 同一前端操作调用准备、上传、合并等多个接口时，每个接口都需要独立权限规则。
7. 修改已有权限的方法或路径时保持权限 ID 稳定，并确认已存储规则会在登录时按 ID 映射到当前配置；新增权限仍由管理员显式授予。
8. 搜索模块名和请求路径，确认没有遗漏调用方、旧路由或失效权限项。

## API 处理器

```ts
import { DbAdmin } from '@server/db'
import { createAdminParamsSchema } from './schema'
import { defineCheckError } from '@server/utils'
import { sys } from '@server/config'

sys.routerV1.post('/createAdmin', async (ctx) => {
	const q = createAdminParamsSchema.safeParse(ctx.request.body)
	if (!q.success) {
		ctx.body = defineCheckError(q.error)
		return
	}

	const db = new DbAdmin({ ctx })
	await db.create(q.data)

	ctx.body = {
		code: 0,
		msg: '创建成功'
	}
})
```

实例化数据库类时传入 `{ ctx }`，以复用数据库上下文、日志和事务能力。

## Schema 与类型

- Body 参数直接使用 `z.object`。
- Query 中的数字字符串参考 `getAdminListParamsSchema`，使用 `z.preprocess` 转换并提供中文错误消息。
- API 参数类型通过 `z.infer<typeof schema>` 得出，避免手写重复类型。
- API 返回给前端的实体类型与数据库内部类型可以不同，避免暴露密码等字段。
- 前端从 `@server/index` 复用这些 API 类型。

## 数据库模块

参考 `packages/server/src/db/modules/admin`：

```ts
const admin = tableMap.admin

export class DbAdmin extends DbFit {
	create(p: CreateAdminParams) {
		return this.query<void>(
			'void',
			/*sql*/ `
				INSERT INTO ${admin.tableName} (name, account)
				VALUES (:name, :account)
			`,
			p
		)
	}
}
```

约定：

1. `index.ts` 导出类并 `export * from './types'`。
2. `types.ts` 放数据库参数和返回实体。
3. 表定义从 `@server/config` 的 `tableMap` 获取。
4. 动态字段使用 `this.ifNotVoid` 或 `this.ifel`。
5. 分页将页码转换为 offset，沿用目标模块当前的 `page/size` 语义。
6. 布尔数据库字段返回后按需要转换为 boolean。
7. 敏感字段只在明确的 `allInfo` 或专用方法中查询。
8. 书写 sql 的关键字时使用大写, 字段命名以下划线分割单词, 返回给外部的字段使用小驼峰命名, sql 语句中保持合理缩进, 预计前方需使用 `/*sql*/` 注释。

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
