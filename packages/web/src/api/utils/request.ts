import router from '@/router'
import axios from 'axios'

export const request = axios.create({
	baseURL: import.meta.env.MODE === 'development' ? 'http://127.0.0.1:3323/api/' : 'http://8.138.99.26/api/',
	timeout: 6000
})

request.interceptors.request.use((req) => {
	req.headers.Authorization = `bearer ${localStorage.getItem('token') ?? ''}`
	return req
})

request.interceptors.response.use(
	(res) => {
		const { code } = res.data
		if (code === -1) {
			router.push('/login')
		}
		return res.data
	},
	(error) => {
		let msg = '请求失败, 请重试 !'
		if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
			msg = '网络连接失败，请检查您的网络！'
		}
		const info = {
			code: 1,
			msg,
			error,
			tip: '此信息来自响应拦截器, 具体错误信息应查看开发者工具'
		}
		console.error(info)
		return info
	}
)
