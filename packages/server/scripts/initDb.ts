import '@server/polyfills.js'
import '@server/config'
import { sys, tableOptions } from '@server/config'
import { MySQLUtil } from '@server/db/utils'
import { styleText } from 'node:util'

const { host, port, database, user, password } = sys.config.mysql.connect
const mysqlUtil = new MySQLUtil({
	poolOptions: {
		host,
		port,
		database,
		user,
		password,
		charset: 'utf8mb4',
		multipleStatements: true,
		waitForConnections: true,
		connectionLimit: 10,
		queueLimit: 0,
		enableKeepAlive: true,
		keepAliveInitialDelay: 0,
		maxIdle: 10,
		idleTimeout: 0
	}
})

const divider = '='.repeat(72)

function printBlock(title: string, desc?: string) {
	console.log(`\n${styleText('cyan', divider)}`)
	console.log(styleText('bold', styleText('cyan', `[init-db] ${title}`)))
	if (desc) {
		console.log(styleText('dim', desc))
	}
	console.log(`${styleText('cyan', divider)}\n`)
}

function printStep(index: number, total: number, tableName: string) {
	const current = String(index).padStart(String(total).length, '0')
	console.log(styleText('yellow', `[${current}/${total}] 正在初始化表: ${tableName}`))
}

async function init() {
	console.clear()
	const total = tableOptions.length

	printBlock('数据库初始化开始', `目标库: ${host}:${port}/${database} | 待处理数据表: ${total}`)

	await mysqlUtil.getConnection()

	for (const [index, tableOption] of tableOptions.entries()) {
		printStep(index + 1, total, tableOption.tableName)
		await mysqlUtil.defineTable(tableOption)
		console.log(styleText('green', `      完成: ${tableOption.tableName}`))
	}

	printBlock('数据库初始化完成', `已完成 ${total} 张数据表的检查与创建`)
	process.exit(0)
}

init().catch((error) => {
	printBlock('数据库初始化失败')
	console.log(styleText('red', error instanceof Error ? (error.stack ?? error.message) : String(error)))
	process.exit(1)
})
