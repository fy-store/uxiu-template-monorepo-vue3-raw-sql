import type { UserInfo } from './types'
import { reactive, readonly } from 'vue'
import { defineStore } from 'pinia'
import { getMyInfo } from '@/api'
import type { MyInfo } from '@t/account'

const getUserInfo = (): UserInfo => {
	const userInfoJSON = localStorage.getItem('userInfo')
	return reactive(userInfoJSON ? JSON.parse(userInfoJSON) : {})
}

export const useUserInfo = defineStore('userInfo', () => {
	const userInfo = reactive({} as MyInfo)
	getMyInfo().then((res) => {
		const { data = {} } = res
		Object.assign(userInfo, data)
	})

	const result = reactive({
		info: readonly(userInfo),
		async refresh() {
			const { data = {} } = await getMyInfo()
			Object.assign(userInfo, data)
			return readonly(userInfo)
		}
	})

	return result
})
