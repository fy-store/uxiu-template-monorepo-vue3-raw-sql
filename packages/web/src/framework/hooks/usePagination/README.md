# usePagination

`usePagination` 封装 Element Plus 分页组件，统一维护页码、每页数量和总数，并通过事件总线触发列表查询。

## 基础用法

```vue
<script setup lang="ts">
	import { usePagination } from '@/framework/hooks/usePagination'

	const { paging, Pagination } = usePagination({
		getList
	})

	async function getList() {
		const { code, data = {} } = await requestList({
			page: paging.page,
			limit: paging.size
		})

		if (code !== 0) return

		paging.count = data.count ?? 0
	}
</script>

<template>
	<Pagination />
</template>
```

默认会在当前微任务中触发一次 `change` 事件，因此 `getList` 无需额外手动调用。

## 配置项

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `pageSizes` | `number[]` | `[1, 10, 20, ...]` | 每页数量选项 |
| `layout` | `string` | `'total, sizes, prev, pager, next, jumper'` | Element Plus 分页布局 |
| `immediate` | `boolean` | `true` | 创建后是否异步触发一次查询 |
| `activatedEmit` | `boolean` | `true` | KeepAlive 页面重新激活时是否查询 |
| `getList` | `(...args: any[]) => any` | - | 分页变化时调用的查询函数 |
| `pagingConfig` | `{ page; size; count }` | `{ page: 1, size: 20, count: 0 }` | 初始分页状态 |
| `paginationProps` | `ElPagination` props | - | 透传给 Element Plus 分页组件的属性 |
| `paginationEvents` | `ElPagination` emits | - | 透传给 Element Plus 分页组件的事件 |
| `customClass` | `string \| object \| string[]` | - | 分页组件类名 |

通过模板传入的 `$attrs` 会与 `paginationProps` 合并，模板属性的优先级更高。

## 返回值

| 字段 | 说明 |
| --- | --- |
| `paging` | 响应式分页状态，包含 `page`、`size`、`count` |
| `Pagination` | 已绑定分页状态和事件的渲染组件 |
| `bus` | 分页事件总线 |
| `options` | 完整配置的响应式引用 |

## 监听分页变化

不传 `getList` 时，可以手动监听 `change` 事件。

```ts
const { bus, paging } = usePagination({
	immediate: false
})

bus.on('change', async (currentPaging) => {
	console.log('currentPaging -> ', currentPaging)
})

// 需要时手动触发
bus.emit('change', paging)
```

`change` 会在页码或每页数量更新后触发，事件参数为当前 `pagingConfig`。

## 自定义 Element Plus 配置

```ts
const { Pagination } = usePagination({
	pageSizes: [10, 20, 50],
	layout: 'total, prev, pager, next',
	paginationProps: {
		background: true,
		hideOnSinglePage: true
	},
	customClass: 'mt-20 justify-end'
})
```

## 注意事项

- 查询成功后需要主动更新 `paging.count`。
- 筛选条件变化并重新查询时，通常应先将 `paging.page` 重置为 `1`。
- `activatedEmit` 依赖组件处于 KeepAlive 环境；不需要恢复时查询可设为 `false`。
- `immediate` 的首次触发是异步的，可在 Hook 创建后继续完成当前组件初始化。
