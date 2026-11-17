import type { SidebarListItem } from '@/config'
import { watchEffect, ref } from 'vue'
import { _project, sidebarList } from '@/config/config'
import { bus } from '@/bus'

import type { MyInfo } from '@server/api/v1/account'
import { account } from '@/api'

export const info = ref<MyInfo>()
export async function refreshInfo() {
	const res = await account.myInfo()
	if (res.code === 0) {
		info.value = res.data!
	} else {
		info.value = void 0
		if (res.error) {
			throw res.error
		}
	}
}

export async function init() {
	await refreshInfo()
	bus.once('app:mounted', async () => {
		watchEffect(() => {
			const menuList =
				info.value?.authority
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
					// 标记 alwaysShow 的项不受权限过滤影响
					if (newIt.alwaysShow) {
						return true
					}
					if (newIt.path) {
						return !!info.value?.isSuper || menuList.includes(newIt.path.slice(1))
					}
				})
			}
			_project.sidebar.list = deepFilter(sidebarList.value)
		})
	})
}
