import type { SidebarListItem } from '@/config'
import { useUserInfo } from '@/stores'
import { watchEffect } from 'vue'
import { _project, sidebarList } from '@/config/config'
import { bus } from '@/bus'

export async function init() {
	bus.once('app:mounted', () => {
		const userInfo = useUserInfo()
		watchEffect(() => {
			const menuList =
				userInfo.info.authority
					?.filter((it) => {
						if (it.path === null && it.methods === null) {
							return true
						}
					})
					.map((it) => it.id) ?? []

			function deepFilter(list: SidebarListItem[]) {
				return list.filter((it) => {
					const newIt = { ...it }
					if (newIt.children) {
						newIt.children = deepFilter(newIt.children)
					}
					if (newIt.path) {
						return !!userInfo.info.isSuper || menuList.includes(newIt.path.slice(1))
					}
				})
			}
			_project.sidebar.list = deepFilter(sidebarList.value)
		})
	})
}
