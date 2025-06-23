import { admin } from '#db'

sys.router.get('/getMyInfo', async (ctx) => {
	const { id } = ctx.userSession

	const [[info]] = await admin.getById(id, true)
	delete info.password
	if (!info.isSuper) {
		delete info.isSuper
	}

	ctx.body = {
		code: 0,
		msg: '获取信息成功',
		data: {
			...info,
			authority: info.authority.map((it) => {
				return {
					id: it.meta.id,
					name: it.meta.name,
					path: it.path,
					methods: it.methods
				}
			})
		}
	}
})
