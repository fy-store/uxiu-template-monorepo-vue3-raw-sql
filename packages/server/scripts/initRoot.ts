import '../src/global/index.js'
import color from 'picocolors'
import { random } from 'uxiu'
import { hash } from '#common'
import { admin, pool } from '#db'
const { getByAccount, updateById, create } = admin

const userConf = {
	account: 'root',
	name: '初始管理员',
	password: random.randomStr(12, random.all)
}

async function init() {
	const [[info]] = await getByAccount(userConf.account, true)
	if (info) {
		await updateById(info.id, {
			name: info.name,
			password: await hash.encode(userConf.password),
			isSuper: 1,
			authority: []
		})
		console.log(color.green('🤤 检测到已存在初始管理员，已为您更正密码'), '\n')
		console.log(color.green(`🤤 您的账号是: ${userConf.account}`), '\n')
		console.log(color.green(`🤤 您的密码是: ${userConf.password}`), '\n')
	} else {
		await create({
			account: userConf.account,
			name: userConf.name,
			password: await hash.encode(userConf.password),
			authority: [],
			isSuper: 1
		})
		console.log(color.green('🤤 初始管理员创建成功'), '\n')
		console.log(color.green(`🤤 您的账号是: ${userConf.account}`), '\n')
		console.log(color.green(`🤤 您的密码是: ${userConf.password}`), '\n')
	}
	await pool.end()
}

init()
