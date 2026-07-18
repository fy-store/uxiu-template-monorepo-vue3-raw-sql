import { SymmetryEncipher } from '@common/symmetryEncipher'
import { styleText } from 'node:util'

const divider = '='.repeat(72)
const symmetryKey = SymmetryEncipher.generateKey()
function printBlock(title: string, desc?: string) {
	console.log(`\n${styleText('cyan', divider)}`)
	console.log(styleText('bold', styleText('cyan', `[key] ${title}`)))
	if (desc) {
		console.log(styleText('dim', desc))
	}
	console.log(`${styleText('cyan', divider)}\n`)
}

function printKey(label: string, value: string) {
	console.log(styleText('green', `${label}: ${value}`))
}

console.clear()
printBlock('对称密钥生成完成', '已生成可用于对称加解密的密钥')
printKey('向量 (IV)', symmetryKey.iv)
printKey('密钥 (Key)', symmetryKey.key)
console.log()
