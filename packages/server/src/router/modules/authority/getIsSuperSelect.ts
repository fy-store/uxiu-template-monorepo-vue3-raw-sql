import type { IsSuperSelect } from '../../types/index.js'

sys.router.get('/getIsSuperSelect', async (ctx) => {
	ctx.body = {
		code: 0,
		msg: '登录成功',
		data: {
			default: 0,
			options: [
				{
					id: 0,
					name: '否'
				},
				{
					id: 1,
					name: '是'
				}
			]
		} as IsSuperSelect
	}
})
