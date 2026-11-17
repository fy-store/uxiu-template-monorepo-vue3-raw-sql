import '@server/polyfills.js'
import '@server/config'
import { random } from 'uxiu'
import { hash } from '@server/common'
import { DbAdmin } from '@server/db'
import { pool } from '@server/db/connect'
import { styleText } from 'node:util'
import { sys } from '@server/config'

const userConf = {
	account: sys.config.init.root.account,
	name: sys.config.init.root.name,
	password: random.randomStr(12, [...random.AZ, ...random.az, ...random.num, '-', '_', '@', '.', '#', '$'])
}

const divider = '='.repeat(72)

function printBlock(title: string, desc?: string) {
	console.log(`\n${styleText('cyan', divider)}`)
	console.log(styleText('bold', styleText('cyan', `[init-root] ${title}`)))
	if (desc) {
		console.log(styleText('dim', desc))
	}
	console.log(`${styleText('cyan', divider)}\n`)
}

function printInfo(label: string, value: string, color: 'green' | 'yellow' = 'green') {
	console.log(styleText(color, `${label}: ${value}`))
}

async function init() {
	console.clear()
	printBlock('初始管理员初始化开始', `账号: ${userConf.account}`)

	const admin = new DbAdmin({ ctx: null })
	const info = await admin.getByAccount(userConf.account)

	if (info) {
		await admin.update({
			id: info.id,
			name: userConf.name,
			password: await hash.encode(userConf.password),
			isSuper: true
		})
		printBlock('检测到已有管理员账号', '已完成密码重置与管理员信息同步')
	} else {
		await admin.create({
			account: userConf.account,
			name: userConf.name,
			password: await hash.encode(userConf.password),
			authority: [],
			isSuper: true,
			remark: ''
		})
		printBlock('初始管理员创建成功')
	}

	printInfo('账号', userConf.account)
	printInfo('密码', userConf.password)

	await admin.submit()
	await pool.end()

	printBlock('初始管理员初始化完成')
}

init().catch(async (error) => {
	await pool.end().catch(() => undefined)
	printBlock('初始管理员初始化失败')
	console.log(styleText('red', error instanceof Error ? (error.stack ?? error.message) : String(error)))
	process.exit(1)
})
