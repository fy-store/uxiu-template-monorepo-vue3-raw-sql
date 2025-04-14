import { convertProps, createCheck } from 'uxiu'
import { admin } from '#db'

$.router.post('/deleteAdmin/:id', async (ctx) => {
	const checkInfo = check(ctx.params)
	if (!checkInfo.result) {
		ctx.body = {
			code: 1,
			msg: checkInfo.fail.msgList[0]
		}
		return
	}

	const { id } = convertProps(ctx.xssParams, {
		id: Number
	})

	const [[info]] = await admin.getById(id)
	if (!info) {
		ctx.body = {
			code: 1,
			msg: '管理员不存在'
		}
		return
	}

	await admin.deleteById(id)
	ctx.body = {
		code: 0,
		msg: '删除成功'
	}
})

const check = createCheck([
	{
		field: 'id',
		type: {
			expect: 'effectiveStrPositiveInt'
		}
	}
])
