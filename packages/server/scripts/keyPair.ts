import { styleText } from 'node:util'
import { AsymmetricEncipher } from '@common/asymmetricEncipher'

const { publicKey, privateKey } = await AsymmetricEncipher.generateKeyPair({ modulusLength: 2048 })

const divider = '='.repeat(72)

function printBlock(title: string, desc?: string) {
	console.log(`\n${styleText('cyan', divider)}`)
	console.log(styleText('bold', styleText('cyan', `[key-pair] ${title}`)))
	if (desc) {
		console.log(styleText('dim', desc))
	}
	console.log(`${styleText('cyan', divider)}\n`)
}

console.clear()
printBlock('RSA 密钥对生成完成', '算法: RSA | 长度: 2048')
console.log(styleText('yellow', 'pem 公钥:'))
console.log(styleText('green', publicKey))
console.log()
console.log(styleText('yellow', 'pem 私钥:'))
console.log(styleText('green', privateKey))
console.log()
