import type { SidebarListItem } from '@/config'
import type { MyInfo } from '@server/api/v1/account'
import { bus, busEventName } from '@/bus'
import { watchEffect, ref } from 'vue'
import { _project, sidebarList } from '@/config/config'
import { account } from '@/api'
import { useTheme } from '@/stores/useTheme'

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
	if (info.value) {
		await useTheme().refreshFromServer()
	}
	bus.once(busEventName.APP_MOUNTED, async () => {
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
					if (newIt.path) {
						return !!info.value?.isSuper || menuList.includes(newIt.path.slice(1))
					}
				})
			}
			_project.sidebar.list = deepFilter(sidebarList.value)
		})
	})
}
