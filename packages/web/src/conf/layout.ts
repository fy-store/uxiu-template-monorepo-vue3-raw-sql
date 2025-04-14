import { reactive, readonly } from 'vue'
import type { Layout } from './types'

const layout = reactive<Layout>({
	header: {
		height: '60px',
		backgroundColor: '#fff',
		color: '#222'
	},

	sidebar: {
		width: '200px'
	},

	main: {
		backgroundColor: '#f6f7fb'
	}
})

export default readonly(layout)
