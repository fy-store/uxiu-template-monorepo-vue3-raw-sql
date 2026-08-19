import { AliOSS } from '@server/utils'
import { sys } from '@server/config'

const { accessKeyId, accessKeySecret, bucket, region } = sys.config.common.aliOSS
export const aliOSS = new AliOSS({
	accessKeyId,
	accessKeySecret,
	bucket,
	region
})
