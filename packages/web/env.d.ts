/// <reference types="vite/client" />
/// <reference types="unocss" />

interface FileSystemDirectoryHandle {
	entries(): AsyncIterableIterator<[string, FileSystemFileHandle | FileSystemDirectoryHandle]>
}
