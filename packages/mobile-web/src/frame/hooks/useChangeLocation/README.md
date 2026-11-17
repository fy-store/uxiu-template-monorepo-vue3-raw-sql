# useChangeLocation

`useChangeLocation` 将布尔状态同步到地址栏参数，参数存在时视为激活。打开时保留现有参数并追加一条历史记录，关闭时优先回退该记录，配合系统返回键（移动端物理返回、浏览器返回）实现返回关闭。

## 基础用法

```vue
<script setup lang="ts">
	import { useChangeLocation } from '@/framework/hooks/useChangeLocation'

	const { visible, open, close, toggle } = useChangeLocation('createDir')
</script>

<template>
	<var-button @click="open">打开</var-button>
	<var-button @click="toggle">切换</var-button>
	<div>是否激活: {{ visible }}</div>
</template>
```

激活后地址栏会变为 `?createDir=1`；用户按系统返回键时参数被移除，`visible` 随之变为 `false`，可用于自动关闭弹窗等场景。

## 配置项

| 参数    | 类型                     | 默认值 | 说明                                |
| ------- | ------------------------ | ------ | ----------------------------------- |
| `key`   | `MaybeRefOrGetter<string>` | 必填 | 地址栏参数名，同一页面同时使用的多个实例需保持唯一 |
| `enabled` | `MaybeRefOrGetter<boolean>` | `true` | 是否启用地址同步，传入 getter 支持响应式切换 |

## 返回值

| 字段      | 类型                  | 说明                       |
| --------- | --------------------- | -------------------------- |
| `visible` | `ComputedRef<boolean>` | 目标参数是否在地址栏中激活 |
| `open`    | `() => Promise<void>`  | 追加参数并新增历史记录     |
| `close`   | `() => Promise<void>`  | 移除参数，可回退时优先回退 |
| `toggle`  | `() => Promise<void>`  | 根据当前状态打开或关闭     |

## 注意事项

- 关闭时若当前历史记录不是由本 hook 追加（如直接打开带参数的链接、刷新页面），会改用替换当前记录的方式移除参数，避免退出页面。
- `open`/`close` 内部通过串行队列执行（包含回退导航的等待），连续操作会按顺序完成，避免历史记录交错。
- 需要通过弹窗组件快速衔接同类弹层（如切换预览实例）时，可调用 `waitChangeLocationIdle()` 等待地址回退完成，再执行后续打开操作：

```ts
import { waitChangeLocationIdle } from '@/framework/hooks/useChangeLocation'

// 先关闭旧实例, 等待其地址回退完成后再打开新实例
closeOldPopup()
await nextTick()
await waitChangeLocationIdle()
openNewPopup()
```
