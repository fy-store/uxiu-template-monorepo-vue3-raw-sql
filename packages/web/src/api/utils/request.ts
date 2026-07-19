import router from '@/router'
import axios from 'axios'
import { persistenceKeys, project } from '@/config'

export const request = axios.create({
	baseURL: project.apiURL,
	timeout: 1000 * 60 * 2,
	withCredentials: true
})

request.interceptors.request.use((req) => {
	const token = localStorage.getItem(persistenceKeys.token) ?? ''
	req.headers.Authorization = `bearer ${token}`
	return req
})

request.interceptors.response.use(
	(res) => {
		if (res.status >= 200 && res.status < 300) {
			if (res.data?.code === -1) {
				router.push('/login')
			}
			return res.data
		}
		return {
			code: res.data?.code ?? 1,
			msg: res.data?.msg ?? `请求错误, status: ${res.status}`,
			tip: '此信息来自响应拦截器包装, code 和 msg 为拦截器自定义, 不代表真实错误, 具体错误请查看开发者工具'
		}
	},
	(error) => {
		const info = {
			code: 1,
			msg: `未知错误, code: ${error.code}, message: ${error.message}, status: ${error?.response?.status ?? '无'}`,
			error,
			tip: '此信息来自请求拦截器包装, code 和 msg 为拦截器自定义, 不代表真实错误, 具体错误请查看开发者工具'
		}
		if (error?.response?.status === 404) {
			info.msg = `资源不存在, status: 404`
		} else if (error?.response?.status === 403) {
			info.msg = `${error?.response?.data?.msg ?? '无权限'}, status: 403`
		} else if (error?.response?.status >= 400 && error?.response?.status < 500) {
			info.msg = `${error?.response?.data?.msg ?? '客户端错误'}, status: ${
				error?.response?.status ?? '>= 400 && < 500'
			}`
		} else if (error?.response?.status >= 500) {
			info.msg = `${error?.response?.data?.msg ?? '服务器异常'}, status: ${error?.response?.status ?? '>= 500'}`
		} else if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
			info.msg = `网络或cors错误, code: ${error.code}, message: ${error.message}, status: ${
				error?.response?.status ?? '无'
			}`
		}

		console.error(info)
		return info
	}
)
