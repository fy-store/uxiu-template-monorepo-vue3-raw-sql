import type { VNode } from 'vue'

export type DownloadMode = 'browser' | 'directory'

export interface EventTypes {
	/**
	 * 预览组件完成挂载后触发。
	 * @param vnode 当前预览组件虚拟节点。
	 */
	preview?: (vnode: VNode) => void
	/** 预览关闭并完成清理后触发。 */
	close?: () => void
}

/** initDecrypt 上下文，可在解密前修改展示信息 */
export interface InitDecryptContext {
	password: string
	/**
	 * 设置解密后的文件名称。
	 * @param name 文件名称。
	 */
	setName(name: string): void
	/**
	 * 设置解密后的扩展名。
	 * @param ext 含点扩展名。
	 */
	setExt(ext: string): void
	/**
	 * 设置解密后的 MIME 类型。
	 * @param mime MIME 类型。
	 */
	setMimeType(mime: string): void
	/**
	 * 设置文件是否采用片段存储。
	 * @param v 是否为片段文件。
	 */
	setIsFragment(v: boolean): void
	/**
	 * 设置视频时长。
	 * @param duration 视频时长，单位为秒。
	 * @deprecated 已废弃，duration 现在包含在 setVideoManifest 中。
	 */
	setDuration?(duration: number): void
	/**
	 * 设置解密后的视频清单信息。
	 * @param manifest 视频尺寸、片段数量、时长和 MPD 索引名。
	 */
	setVideoManifest(manifest: {
		width?: number
		height?: number
		segmentCount?: number
		duration?: number
		manifestIndex?: string
	}): void
}

export interface TemplateProps {
	[key: string]: any
	/** 文件 URL（原始 URL） */
	url: string
	/** 文件名称（展示用） */
	name: string
	/** 扩展名（含点，如 .uef, .mp4） */
	ext: string
	/** 是否为片段存储 */
	isFragment: boolean
	isEncrypted: boolean
	/** 元信息（JSON 字符串，可能带 .uef 后缀） */
	meta?: string
	/** 自定义类名 */
	customClass?: string | Object | string[]
	/** 显示隐藏控制 */
	visible: boolean
	/** 可选：本地文件用于上传时预览 */
	file?: File
	/** 可选：上传/解密密码 */
	password?: string
	/**
	 * 解密文件前初始化展示信息和视频清单。
	 * @param ctx 解密初始化上下文。
	 */
	initDecrypt?: (ctx: InitDecryptContext) => void | Promise<void>
}

export interface PreviewOptions {
	/** 文件 URL（原始 URL） */
	url: string
	/** 文件名称（展示用） */
	name: string
	/** 扩展名（含点，如 .uef, .mp4） */
	ext: string
	/** 是否为片段存储 */
	isFragment?: boolean
	isEncrypted?: boolean
	/** 元信息（JSON 字符串，可能带 .uef 后缀） */
	meta?: string
	/** 自定义类名 */
	customClass?: string | Object | string[]
	/** 可选：本地文件用于上传时预览 */
	file?: File
	/** 可选：上传/解密密码 */
	password?: string
	/**
	 * 解密文件前初始化展示信息和视频清单。
	 * @param ctx 解密初始化上下文。
	 */
	initDecrypt?: (ctx: InitDecryptContext) => void | Promise<void>
}
