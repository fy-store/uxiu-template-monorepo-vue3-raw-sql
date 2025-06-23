import type { IsSuper, UpdateAdmin } from '#router'
import type { UpdateAdmin as DbUpdateAdmin, Admin } from '#db'
import type { UserSession } from '#middleware'
import { admin } from '#db'
import { hash } from '#common'
import { idsToConfig, authorityConfig } from '#conf'
import { convertProps, createCheck, extract, Inspector } from 'uxiu'

sys.router.post('/updateAdmin/:id', async (ctx) => {
	const checkIdInfo = checkId(ctx.params)
	if (!checkIdInfo.result) {
		ctx.body = {
			code: 1,
			msg: checkIdInfo.fail.msgList[0]
		}
		return
	}

	const checkInfo = check(ctx.request.body)
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

	const [[info]] = await admin.getById(id, true)
	if (!info) {
		ctx.body = {
			code: 1,
			msg: '管理员不存在'
		}
		return
	}

	const params = extract(ctx.request.xssBody as UpdateAdmin, ['name', 'isSuper', 'password', 'authority'])
	const { name, isSuper, authority, password } = params
	const data: DbUpdateAdmin = {
		name,
		isSuper: ctx.userSession.isSuper ? isSuper : info.isSuper,
		authority: (function () {
			const allowOperateAuthority = filterAllowOperateAuthority(authority, ctx.userSession)
			const addAuthority = filterAddAuthority(allowOperateAuthority, info.authority)
			const removeAuthority = filterRemoveAuthority(allowOperateAuthority, info.authority)
			const originAuthority = info.authority.map((it) => it.meta.id)
			return Inspector.rulesToSerialize(
				Inspector.create(
					idsToConfig([...new Set(originAuthority.concat(addAuthority).filter((id) => !removeAuthority.includes(id)))]),
					{ base: sys.conf.project.apiPath }
				)
			)
		})(),
		password: password ? await hash.encode(password) : info.password
	}

	await admin.updateById(id, data)

	ctx.body = {
		code: 0,
		msg: '更新成功'
	}
})

const checkId = createCheck([
	{
		field: 'id',
		type: {
			expect: 'effectiveStrPositiveInt'
		}
	}
])

const check = createCheck<UpdateAdmin>([
	{
		field: 'name',
		required: false,
		type: {
			expect: 'string'
		},
		length: {
			expect: {
				min: 1,
				max: 10
			}
		}
	},
	{
		field: 'password',
		required: false,
		type: {
			expect: 'string'
		},
		length: {
			expect: {
				min: 5,
				max: 12
			}
		}
	},
	{
		field: 'isSuper',
		required: false,
		type: {
			expect: 'number'
		},
		customs: [
			(data) => {
				const isSuperOptions: IsSuper[] = [0, 1]
				return {
					result: isSuperOptions.includes(data),
					message: `isSuper 必须是 ${isSuperOptions.join('、')}`
				}
			}
		]
	},
	{
		field: 'authority',
		type: {
			expect: 'array'
		},
		customs: [
			(data) => {
				return {
					result: data.every((item: any) => typeof item === 'string'),
					message: '权限格式有误'
				}
			}
		]
	}
])

/** 返回允许操作的权限 */
function filterAllowOperateAuthority(authority: string[], userSession: UserSession) {
	const userAuthority = userSession.isSuper ? authorityConfig : userSession.authority
	return authority.filter((id) => userAuthority.find((it) => it.meta.id === id))
}

/** 返回新增的权限 */
function filterAddAuthority(authority: string[], originAuthority: Admin['authority']) {
	return authority.filter((id) => !originAuthority.find((it) => it.meta.id === id))
}

/** 返回移除的权限 */
function filterRemoveAuthority(authority: string[], originAuthority: Admin['authority']) {
	return originAuthority.filter((it) => !authority.find((id) => id === it.meta.id)).map((it) => it.meta.id)
}
