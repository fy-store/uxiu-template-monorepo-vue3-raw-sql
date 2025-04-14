import { readonly, type InspectorType, type ReadonlyType } from 'uxiu'
import type {
	AuthorityItem,
	AuthorityConfItem,
	Meta,
	ReadonlyAuthorityConfList,
	ReadonlyAuthorityTree
} from '@/conf/types/index.js'

/** 权限树 */
export const authorityTree: ReadonlyAuthorityTree = readonly([
	{
		id: '1',
		name: '管理员',
		children: [
			{
				id: '1-1',
				name: '获取管理员列表',
				methods: 'GET',
				path: 'getAdminList'
			},
			{
				id: '1-2',
				name: '添加管理员',
				methods: 'POST',
				path: 'createAdmin'
			}
		]
	},
	{
		id: '2',
		name: '权限',
		children: [
			{
				id: '2-1',
				name: '获取权限选择器',
				methods: 'GET',
				path: 'getAuthoritySelect'
			}
		]
	}
])

/** 权限配置 */
export const authorityConfig: ReadonlyAuthorityConfList = readonly(treeToConfig(authorityTree))

/** 将权限树转为权限配置列表 */
export function treeToConfig(authorityList: ReadonlyAuthorityTree): AuthorityConfItem[] {
	const result = []
	function filter(list: ReadonlyAuthorityTree) {
		list.forEach((it) => {
			if (it.children) {
				filter(it.children)
			} else {
				result.push({
					path: it.path,
					methods: it.methods,
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
export function configToTree(
	config: InspectorType.RuleSerialize<Meta>[] | ReadonlyType.DeepReadonly<InspectorType.RuleSerialize<Meta>[]>
): AuthorityItem[] {
	const ids = new Set(config.map((p: InspectorType.RuleSerialize<Meta>) => p.meta.id))
	const filter = (nodes: ReadonlyAuthorityTree): AuthorityItem[] => {
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
			.filter((node): node is AuthorityItem => node !== null)
	}

	return filter(authorityTree)
}

/** 将 ids 转换为序列化的规则列表 */
export function idsToConfig(ids: string[]) {
	return authorityConfig.filter((it) => {
		return ids.includes(it.meta.id)
	})
}
