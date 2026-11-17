import type { SidebarListItem } from '@/config'
import type { MyInfo } from '@server/api/v1/account'
import type { CommonConfig } from '@server/api/v1/config'
import { bus, busEventName } from '@/bus'
import { watchEffect, ref } from 'vue'
import { _project, sidebarList } from '@/config/config'
import { account, config as configApi } from '@/api'

export const info = ref<MyInfo>()
export const commonConfig = ref<CommonConfig>()
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

export async function refreshCommonConfig() {
	const res = await configApi.commonConfig()
	if (res.code === 0) {
		commonConfig.value = res.data!
	} else {
		commonConfig.value = void 0
		if (res.error) {
			throw res.error
		}
	}
}

export async function init() {
	await Promise.all([refreshInfo(), refreshCommonConfig()])
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
