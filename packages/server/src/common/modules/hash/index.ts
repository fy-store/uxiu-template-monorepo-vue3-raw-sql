import bcrypt from 'bcrypt'

const encode = (str: string) => {
	return bcrypt.hash(str, sys.conf.project.common.hash.salt)
}

const compare = (plaintextStr: string, hashStr: string) => {
	return bcrypt.compare(plaintextStr, hashStr)
}

export const hash = { encode, compare }
