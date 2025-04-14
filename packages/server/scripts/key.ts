import color from 'picocolors'
import { random } from 'uxiu'

const strArr = [...random.AZ, ...random.az, ...random.num]

const key8 = random.randomStr(8, strArr)
const key16 = random.randomStr(16, strArr)
const key32 = random.randomStr(32, strArr)
const key64 = random.randomStr(64, strArr)

console.log(color.green(`8位: ${key8}`), '\n')
console.log(color.green(`16位: ${key16}`), '\n')
console.log(color.green(`32位: ${key32}`), '\n')
console.log(color.green(`64位: ${key64}`), '\n')
