import { readonly } from 'vue'
import { defineStore } from 'pinia'
import { info, refreshInfo } from '@/init'

export const useUserInfo = defineStore('userInfo', () => {
	return {
		refreshInfo,
		/** 当未登录或登录过期时，info 为 undefined */
		info: readonly(info)
	}
})
