import type { Login } from '#router'
import type { UserSession } from '#db'
import { sleep, createCheck, random } from 'uxiu'
import { hash, encipher } from '#common'
import { admin } from '#db'

$.router.post('/login', async (ctx) => {
	const checkInfo = check(ctx.request.body)
	if (!checkInfo.result) {
		ctx.body = {
			code: 1,
			msg: checkInfo.fail.msgList[0]
		}
		return
	}

	const { account, password } = ctx.request.xssBody
	const startTimer = Date.now()
	const [[info]] = await admin.getByAccount(account, true)
	if (!info) {
		const difTimer = Date.now() - startTimer
		if (difTimer < 200) {
			await sleep(random(200, 400) - difTimer)
		}
		ctx.body = {
			code: 1,
			msg: '账号或密码有误'
		}
		return
	}

	if (!(await hash.compare(password, info.password))) {
		const difTimer = Date.now() - startTimer
		if (difTimer < 200) {
			await sleep(random(200, 400) - difTimer)
		}
		ctx.body = {
			code: 1,
			msg: '账号或密码有误'
		}
		return
	}

	const currentUserSessions: [string, UserSession['sessionValue']][] = []
	await ctx.userSessionStore.each((id, value: UserSession['sessionValue']) => {
		if (value.id === info.id) {
			currentUserSessions.push([id, value])
		}
	})

	// 当当前用户会话超过最大数量时，删除最久未操作的会话
	if (currentUserSessions.length >= $.sysConf.project.loginVerify.maxSession) {
		let mostLongTimeNotOperate: [string, UserSession['sessionValue']] = currentUserSessions[0]
		for (let i = 1; i < currentUserSessions.length; i++) {
			const [id, value] = currentUserSessions[i]
			if (value.latelyOperationTimer < mostLongTimeNotOperate[1].latelyOperationTimer) {
				mostLongTimeNotOperate = [id, value]
			}
		}
		await ctx.userSessionStore.delete(mostLongTimeNotOperate[0])
	}

	const sessionId = await ctx.userSessionStore.create({
		id: info.id,
		ip: ctx.ip,
		latelyOperationTimer: Date.now(),
		isSuper: info.isSuper,
		authority: info.authority
	})

	ctx.body = {
		code: 0,
		msg: '登录成功',
		data: {
			name: info.name,
			token: encipher.encryption(sessionId)
		}
	}
})

const check = createCheck<Login>([
	{
		field: 'account',
		type: {
			expect: 'string'
		}
	},
	{
		field: 'password',
		type: {
			expect: 'string'
		}
	}
])
