import type { RuleSerialize, UserSession, DeepReadonly } from '#middleware'
import type { Meta, ReadonlyAuthorityConfList } from '#conf'
import type { CreateAdmin } from '#router'
import { createCheck, Inspector, isString } from 'uxiu'
import { hash } from '#common'
import { admin } from '#db'
import { authorityConfig } from '#conf'

$.router.post('/createAdmin', async (ctx) => {
	const checkInfo = check(ctx.request.body)
	if (!checkInfo.result) {
		ctx.body = {
			code: 1,
			msg: checkInfo.fail.msgList[0]
		}
		return
	}

	const { account, password, name = '未命名', isSuper = 0, authority } = ctx.xssBody as CreateAdmin

	const [[info]] = await admin.getByAccount(account)
	if (info) {
		ctx.body = {
			code: 1,
			msg: '账号已存在'
		}
		return
	}

	await admin.create({
		account,
		password: await hash.encode(password),
		authority: filterAuthority(authority, ctx.userSession),
		name,
		isSuper
	})

	ctx.body = {
		code: 0,
		msg: '创建成功'
	}
})

const check = createCheck<CreateAdmin>([
	{
		field: 'account',
		type: {
			expect: 'string'
		},
		length: {
			expect: {
				min: 3,
				max: 20
			}
		},
		customs: [
			(data) => {
				const reg = /^[a-zA-Z_\-][a-zA-Z0-9_\-]{2,}$/
				return {
					result: reg.test(data),
					message: 'account 必须以字母开头, 只能包含字母、数字、下划线、减号'
				}
			}
		]
	},
	{
		field: 'password',
		type: {
			expect: 'string'
		},
		length: {
			expect: {
				min: 5,
				max: 20
			}
		}
	},
	{
		field: 'name',
		required: false,
		type: {
			expect: 'string'
		},
		length: {
			expect: {
				min: 1,
				max: 20
			}
		}
	},
	{
		field: 'isSuper',
		required: false,
		customs: [
			(data) => {
				const allowList = [0, 1]
				return {
					result: allowList.includes(data),
					message: `isSuper 只允许 ${allowList.join('、')}`
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
			(data: any[]) => {
				return {
					result: data.every(isString),
					message: `authority 必须是字符串数组`
				}
			}
		]
	}
])

/** 返回当前用户允许创建的权限序列化列表 */
function filterAuthority(authority: string[], userSession: UserSession) {
	if (authority.length === 0) return []
	let userAuthority: ReadonlyAuthorityConfList | RuleSerialize[] | DeepReadonly<RuleSerialize[]>
	if (userSession.isSuper) {
		userAuthority = authorityConfig
	} else {
		userAuthority = userSession.authority
	}
	const list = []
	authority.forEach((id) => {
		const item = userAuthority.find((el) => el.meta.id === id)
		if (item) list.push(item)
	})

	return Inspector.rulesToSerialize(Inspector.create<Meta>(list, { base: $.sysConf.project.apiPath }))
}
