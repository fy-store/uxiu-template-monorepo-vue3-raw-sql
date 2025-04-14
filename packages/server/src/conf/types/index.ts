import type { InspectorType, ReadonlyType } from 'uxiu'

export interface Meta {
	/** 唯一标识 */
	id: string
	/** 权限名称 */
	name: string
}

export interface AuthorityItem {
	id: string
	name: string
	path?: string
	methods?: InspectorType.Method | InspectorType.Method[] | '*'
	children?: AuthorityItem[]
}

export type ReadonlyAuthorityTree = ReadonlyType.DeepReadonly<AuthorityItem[]>

export interface AuthorityConfItem {
	path: string
	methods: InspectorType.Method | InspectorType.Method[] | '*'
	meta: Meta
}

export type ReadonlyAuthorityConfList = ReadonlyType.DeepReadonly<AuthorityConfItem[]>
