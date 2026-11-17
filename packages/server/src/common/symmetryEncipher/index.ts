import { sys } from '@server/config'
import { SymmetryEncipher } from '@common/symmetryEncipher'

const { iv, key } = sys.config.common.symmetryEncipher
export const encipher = new SymmetryEncipher({ iv, key })
