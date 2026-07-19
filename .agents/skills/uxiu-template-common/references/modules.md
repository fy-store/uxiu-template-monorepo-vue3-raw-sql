# Common 模块参考

## 当前模块

| 导入路径 | 用途 | 关键约束 |
| --- | --- | --- |
| `@common/encryptor` | ArrayBuffer、文本、文件和流式加解密 | 单实例同一时间只执行一个任务；支持 cancel |
| `@common/computeHash` | 文本、ArrayBuffer、Blob、路径哈希 | Node 文件路径使用动态 `node:fs/promises` |
| `@common/concurrencyControl` | 动态并发任务调度 | `ctx.index` 从 1 开始，任务结束时调用 `ctx.stop()` |
| `@common/asymmetricEncipher` | 非对称加解密 | 检查运行时加密 API 与编码格式 |
| `@common/symmetryEncipher` | 对称加解密 | 检查二进制与字符串转换 |

## 并发控制

```ts
await concurrencyControl(async (ctx) => {
	const index = ctx.index - 1
	if (index >= tasks.length) {
		ctx.stop()
		return
	}

	await tasks[index]()
}, limit)
```

注意：

- `concurrencyControl` 是开放式任务生成器，不接收任务数组。
- 必须在索引越界时调用 `ctx.stop()`，否则会继续生成任务。
- 回调抛错会拒绝外层 Promise，但已经运行的任务不会自动取消外部资源。
- 网络任务仍需调用方管理 `AbortController`。
- 需要顺序结果时按索引写入预分配数组，最后再顺序消费。

## Encryptor

- `Encryptor` 同时支持 ArrayBuffer、文本和 ReadableStream。
- 同一实例运行中再次调用会抛 `ALREADY_RUNNING`。
- 每个并发加解密任务创建独立实例。
- 流取消时调用 `cancel()`，并取消 reader/fetch。
- 文件名、MIME 等敏感信息需要放入密文元数据，不要在公开存储名中泄露。
- 处理返回二进制时关注 `ArrayBufferLike` 与独立 `ArrayBuffer` 的类型差异，必要时复制到新的 `Uint8Array`。

## ComputeHash

- 浏览器和 Node 共用 `globalThis.crypto.subtle`。
- Node 本地文件路径只在 Node 分支动态导入 `node:fs/promises`。
- URL、Blob 和 data URL 可走 Web API。
- 新增算法或输入类型时保持返回格式稳定，当前为小写十六进制字符串。

## 跨运行时设计

推荐：

```ts
const processLike = (globalThis as typeof globalThis & {
	process?: { versions?: { node?: string } }
}).process

const isNode = typeof processLike?.versions?.node === 'string'
```

避免：

- 顶层静态导入 `node:*` 后期待浏览器构建自动忽略。
- 使用 Vue、Koa 或项目 config 类型污染 common。
- 依赖仅由某个包的 polyfill 提供、但 common 类型声明未覆盖的提案 API。
- 直接返回共享底层 buffer，导致 transfer 或切片产生意外数据范围。

## 模块结构

```text
packages/common/src/example/
├── index.ts
└── types.ts
```

`index.ts` 使用 `export type * from './types'` 暴露类型。没有必要时不要增加额外层级或根聚合入口。

新增模块前先搜索 web、server 和 common 是否已有同类能力。创建后用 `@common/<module>` 的真实导入方式分别检查浏览器与 Node 消费端，避免只验证模块自身。

## 消费端验证

- Web：检查 Vite 是否将 Node 模块 externalize；真正会执行的浏览器路径不得依赖 Node API。
- Server：检查 ESM 动态 import 和 `moduleResolution: bundler` 下的类型。
- Worker：不要假定 DOM 主线程 API 可用；只声明和使用实际需要的最小结构。
