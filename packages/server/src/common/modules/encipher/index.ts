import crypto from 'crypto'

const encryption = (plaintext: string) => {
	const { iv, key } = sys.conf.project.common.encipher
	const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
	return cipher.update(plaintext, 'utf8', 'hex') + cipher.final('hex')
}

const decrypted = (encrypted: string) => {
	const { iv, key } = sys.conf.project.common.encipher
	const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
	return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8')
}

export const encipher = {
	encryption,
	decrypted
}
