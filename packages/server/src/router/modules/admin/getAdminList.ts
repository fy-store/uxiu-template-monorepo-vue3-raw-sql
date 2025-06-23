import type { QueryAdmin } from '../../types/index.js'
import { convertProps, createCheck } from 'uxiu'
import { admin } from '#db'

sys.router.get('/getAdminList', async (ctx) => {
	const checkInfo = check(ctx.query)
	if (!checkInfo.result) {
		ctx.body = {
			code: 1,
			msg: checkInfo.fail.msgList[0]
		}
		return
	}

	const { name, page, size } = convertProps(ctx.xssQuery as QueryAdmin, {
		name(data) {
			return data ?? ''
		},
		page: Number,
		size: Number
	})

	const [list] = await admin.getList(
		{
			name,
			page,
			size
		},
		true
	)

	const [[{ count }]] = await admin.getCount({
		name
	})

	ctx.body = {
		code: 0,
		msg: '获取管理员列表成功',
		data: {
			list: list.map((it) => {
				const newItem = {
					...it,
					authority: it.authority.map((it) => it.meta.id)
				}
				delete newItem.password
				return newItem
			}),
			count
		}
	}
})

const check = createCheck<QueryAdmin>([
	{
		field: 'name',
		required: false,
		type: {
			expect: 'string'
		}
	},
	{
		field: 'page',
		type: {
			expect: 'effectiveStrPositiveInt'
		}
	},
	{
		field: 'size',
		type: {
			expect: 'effectiveStrPositiveInt'
		},
		range: {
			transform(data) {
				return +data
			},
			expect: {
				min: 1,
				max: 2000
			}
		}
	}
])
