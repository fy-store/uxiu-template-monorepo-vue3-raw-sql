# useContextMenu

`useContextMenu` 提供右键菜单状态、事件总线和可选的渲染组件。默认情况下调用 `open` 后会自动将菜单挂载到 `document.body`，也可以在模板中显式渲染 `ContextMenu` 来使用插槽。

## 基础用法

```vue
<script setup lang="ts">
	import { useContextMenu } from '@/framework/hooks/useContextMenu'

	const contextMenu = useContextMenu({
		items: [
			{ name: '重命名', value: 'rename' },
			{ name: '删除', value: 'delete', divided: true }
		]
	})

	function openMenu(event: MouseEvent) {
		contextMenu.open(event, {
			context: { id: 1 }
		})
	}

	contextMenu.bus.on('select', (item, context) => {
		console.log('item -> ', item)
		console.log('context -> ', context)
	})
</script>

<template>
	<div @contextmenu.prevent="openMenu">右键打开菜单</div>
</template>
```

## 显式渲染

需要自定义菜单项内容时，将 `autoMount` 设为 `false`，并渲染返回的 `ContextMenu` 组件。

```vue
<script setup lang="ts">
	import { useContextMenu } from '@/framework/hooks/useContextMenu'

	const { ContextMenu, open } = useContextMenu({
		autoMount: false
	})

	function openMenu(event: MouseEvent) {
		open(event, {
			items: [
				{ name: '复制链接', icon: 'i-ep-link' },
				{ name: '分享', icon: 'i-ep-share' }
			]
		})
	}
</script>

<template>
	<div @contextmenu.prevent="openMenu">右键打开菜单</div>

	<ContextMenu>
		<template #item="{ item, context }">
			<i v-if="item.icon" :class="item.icon" class="mr-6px text-12px" />
			<span>{{ item.name }}</span>
		</template>
	</ContextMenu>
</template>
```

## 配置项

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `items` | `MenuItem[]` | `[]` | 默认菜单项 |
| `customClass` | `string` | `''` | 菜单根节点自定义类名 |
| `zIndex` | `number` | `2000` | 菜单层级 |
| `minWidth` | `number \| string` | `160` | 菜单最小宽度，数字按像素处理 |
| `offset` | `number` | `2` | 相对鼠标或坐标的偏移量 |
| `closeOnClick` | `boolean` | `true` | 选择菜单项后是否关闭 |
| `closeOnScroll` | `boolean` | `true` | 页面滚动时是否关闭 |
| `closeOnResize` | `boolean` | `true` | 窗口尺寸变化时是否关闭 |
| `teleport` | `boolean` | `true` | 是否将菜单传送到 `body` |
| `autoMount` | `boolean` | `true` | 未显式渲染组件时是否自动挂载 |

## 菜单项

```ts
interface MenuItem {
	name: string
	value?: string | number
	icon?: string
	disabled?: boolean
	divided?: boolean
	hidden?: boolean
	onClick?: (item: MenuItem, context?: any) => void
}
```

`divided` 会在当前菜单项之前显示分割线。`hidden` 为 `true` 时不渲染该项，`disabled` 为 `true` 时不会触发选择事件。

## 返回值

| 字段 | 说明 |
| --- | --- |
| `bus` | `open`、`close`、`select` 事件总线 |
| `config` | 响应式完整配置 |
| `state` | 菜单显示状态、坐标、菜单项和上下文 |
| `ContextMenu` | 可在模板中显式渲染的组件 |
| `open(posOrEvent, options?)` | 使用鼠标事件或 `{ x, y }` 坐标打开菜单 |
| `close()` | 关闭菜单 |
| `bindContextMenu(options?)` | 创建可绑定到 `contextmenu` 的处理函数 |
| `setItems(items)` | 替换默认菜单项 |

## 事件

```ts
contextMenu.bus.on('open', ({ position, items, context }) => {})
contextMenu.bus.on('select', (item, context) => {})
contextMenu.bus.on('close', () => {})
```

## 注意事项

- 在事件中打开菜单时，建议使用 `@contextmenu.prevent` 阻止浏览器默认菜单。
- 菜单会自动修正位置，避免超出当前视口。
- 服务端渲染环境不会访问 `window` 或 `document`，但自动挂载仅在浏览器中生效。
