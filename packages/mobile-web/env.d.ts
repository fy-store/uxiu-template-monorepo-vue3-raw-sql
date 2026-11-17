/// <reference types="vite/client" />
/// <reference types="unocss" />

// Varlet 按需引入的组件样式
declare module '@varlet/ui/es/*/style/index.mjs'
// 桌面端开发时使用的触摸事件模拟器
declare module '@varlet/touch-emulator'

interface FileSystemDirectoryHandle {
	entries(): AsyncIterableIterator<[string, FileSystemFileHandle | FileSystemDirectoryHandle]>
}
