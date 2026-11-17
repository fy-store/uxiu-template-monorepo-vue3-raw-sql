import type { UseAppCommunicateState } from './types'
import { reactive, readonly } from 'vue'
import { defineStore } from 'pinia'

export const useAppCommunicate = defineStore('appCommunicate', () => {
	const state = reactive<UseAppCommunicateState>({
		isSidebarIsCollapse: false
	})

	return reactive({
		state: readonly(state),
		changeSidebarIsCollapse(value: boolean) {
			state.isSidebarIsCollapse = value
		}
	})
})
