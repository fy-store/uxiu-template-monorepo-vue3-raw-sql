# 移动端模板

基于 Vue 3 + Vite 的移动端项目模板, 与 `packages/admin-web` 共用服务端能力。

## 技术约定

- 组件库使用 [Varlet UI](https://varletjs.org/) (`@varlet/ui`), 通过 `unplugin` 按需自动导入, 模板中使用 `<var-button>`、`<var-input>` 等写法即可。
- 尺寸统一使用 `px` 编写, 由 `postcss-px-to-viewport` 按 375 设计稿转换为 `vmin`; UnoCSS 使用 `presetRemToPx` 保证工具类同样输出 `px`。
- 主题色在 `src/config/config.ts` 中维护, 通过 `src/framework/utils/varletTheme.ts` 同步到 Varlet 设计变量。
- 底部标签栏由 `src/framework/core/layout` 提供, 标签列表在 `src/config/config.ts` 的 `sidebarList` 中维护。
- 消息提示与确认弹窗使用 `src/framework/utils/feedback.ts` 导出的 `Snackbar`、`confirm`, 表单校验规则使用函数数组 (如 `[(v) => !!v || '必填']`)。

## 项目结构

- src
    - framework: 框架模板相关代码
        - core 框架核心组件, 属于模板核心, 不建议直接使用
            - layout 布局组件 (BottomNav 底部标签栏)
        - components: 通用组件
        - hooks hook 组件
        - utils 工具函数 (主题、Varlet 主题桥接、消息反馈、组件缓存)

## 常用命令

```powershell
pnpm dev        # 启动开发服务
pnpm build      # 类型检查 + 生产构建
pnpm type-check # 仅类型检查
```

