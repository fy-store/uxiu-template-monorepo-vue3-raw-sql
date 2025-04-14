import { project } from '@/conf'
import type { SidebarListItem } from '@/conf/types'
import type { DeepReadonly } from 'vue'

/**
 * 根据 path 获取侧边栏项
 */
export default (path: string) => {
	const deepFind = (path: string, list: DeepReadonly<SidebarListItem[]>): DeepReadonly<SidebarListItem> | undefined => {
		if (!path.startsWith('/')) {
			path = '/' + path
		}
		for (const it of list) {
			if (it.children) {
				const result = deepFind(path, it.children)
				if (result) {
					return result
				}
			} else if (it.path) {
				const itPath = it.path.startsWith('/') ? it.path : '/' + it.path
				if (itPath === path) {
					return it
				}
			}
		}
	}

	return deepFind(path, project.sidebar.list)
}
