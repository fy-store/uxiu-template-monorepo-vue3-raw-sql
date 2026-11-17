import type { AuthMeta, AuthorityConfigItem, AuthorityTreeItem, AuthorityTree } from './types'
import type { RequestInspectorRuleSerialize } from 'uxiu'
import { authorityTree, authorityConfigList } from './index'

/** 将权限树转为权限配置列表 */
export function authorityTreeToConfigList(authorityList: AuthorityTree): AuthorityConfigItem[] {
	const result: AuthorityConfigItem[] = []
	function filter(list: AuthorityTree) {
		list.forEach((it) => {
			if (it.children) {
				filter(it.children)
			} else {
				result.push({
					path: it.path as AuthorityConfigItem['path'],
					methods: it.methods as AuthorityConfigItem['methods'],
					meta: {
						id: it.id,
						name: it.name
					}
				})
			}
		})
	}

	filter(authorityList)
	return result
}

/** 将权限配置列表转为权限树 */
export function authorityConfigToTree(config: RequestInspectorRuleSerialize<AuthMeta>[]): AuthorityTreeItem[] {
	const ids = new Set(config.map((p: RequestInspectorRuleSerialize<AuthMeta>) => p.meta!.id))
	const filter = (nodes: AuthorityTree): AuthorityTreeItem[] => {
		return nodes
			.map((node) => {
				if (node.children) {
					const filteredChildren = filter(node.children)
					if (filteredChildren.length > 0) {
						return { ...node, children: filteredChildren }
					}
				}
				if (ids.has(node.id)) {
					return { ...node }
				}
				return null
			})
			.filter((node): node is AuthorityTreeItem => node !== null)
	}

	return filter(authorityTree)
}

/** 将 ids 转换为序列化的规则列表 */
export function authorityIdsToConfig(ids: string[]) {
	return authorityConfigList.filter((it) => {
		return ids.includes(it.meta.id)
	})
}

/**
 * 验证权限树 id, path 是否存在重复
 * @param tree 权限树
 * @throws 如果存在重复的 id 或 path，则抛出错误
 */
export function checkAuthorityTreeRepeat(tree: AuthorityTree) {
	const idSet = new Set<string>()
	const pathSet = new Set<string>()

	function check(nodes: AuthorityTree) {
		nodes.forEach((node) => {
			if (idSet.has(node.id)) {
				throw new Error(`权限树 id 重复: ${node.id}`)
			}
			idSet.add(node.id)

			if (node.path && pathSet.has(node.path)) {
				throw new Error(`权限树 path 重复: ${node.path}`)
			}
			pathSet.add(node.path || '')

			if (node.children) {
				check(node.children)
			}
		})
	}

	check(tree)
}

/**
 * 验证权限配置列表 id, path 是否存在重复
 * @param list 权限配置列表
 * @throws 如果存在重复的 id 或 path，则抛出错误
 */
export function checkAuthorityConfigRepeat(list: AuthorityConfigItem[]) {
	const idSet = new Set<string>()
	const pathSet = new Set<string>()

	list.forEach((item) => {
		if (idSet.has(item.meta.id)) {
			throw new Error(`权限配置 id 重复: ${item.meta.id}`)
		}
		idSet.add(item.meta.id)

		if (pathSet.has(item.path)) {
			throw new Error(`权限配置 path 重复: ${item.path}`)
		}
		pathSet.add(item.path)
	})
}
