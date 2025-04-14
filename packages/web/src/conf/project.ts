import type { Project } from './types'
import { reactive, readonly, shallowRef } from 'vue'
import { Avatar } from '@element-plus/icons-vue'

const project = reactive<Project>({
	name: '导航系统',
	sidebar: {
		list: [
			{
				path: '/admin',
				title: '管理员管理',
				icon: shallowRef(Avatar)
			}
		]
	}
})

export default readonly(project)
