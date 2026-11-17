import { readonly } from 'vue'
import { defineStore } from 'pinia'
import { info, commonConfig, refreshInfo, refreshCommonConfig } from '@/init'

export const useUserInfo = defineStore('userInfo', () => {
	return {
		refreshInfo,
		refreshCommonConfig,
		/** 当未登录或登录过期时，info 为 undefined */
		info: readonly(info),
		/** 当未登录或登录过期时，commonConfig 为 undefined */
		commonConfig: readonly(commonConfig)
	}
})
