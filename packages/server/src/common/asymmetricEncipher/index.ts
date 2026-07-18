import { sys } from '@server/config'
import { AsymmetricEncipher } from '@common/asymmetricEncipher'

const { privateKey, publicKey } = sys.config.common.asymmetricEncipher
export const asymmetricEncipher = new AsymmetricEncipher({ privateKey, publicKey })
