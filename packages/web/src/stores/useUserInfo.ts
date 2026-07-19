import type { MyInfo } from '@server/index'
import { reactive, ref, readonly } from 'vue'
import { defineStore } from 'pinia'
import { account } from '@/api'

export const useUserInfo = defineStore('userInfo', () => {
	const userInfo = ref({} as MyInfo)
	account.getMyInfo().then((res) => {
		const { data = {} } = res
		Object.assign(userInfo.value, data)
	})

	const result = reactive({
		info: readonly(userInfo),
		async refresh() {
			const { data = {} } = await account.getMyInfo()
			Object.keys(userInfo.value).forEach((key) => {
				delete userInfo.value[key as keyof MyInfo]
			})
			Object.assign(userInfo.value, data)
			return userInfo
		}
	})

	return result
})
