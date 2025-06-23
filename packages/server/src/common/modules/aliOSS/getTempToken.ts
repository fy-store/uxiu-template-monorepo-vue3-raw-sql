import OSS from 'ali-oss'
import type { AliOSSCreateOptions } from '#common'

let sts: OSS.STS = null
const getSts = () => {
	const { aliOSS } = sys.conf.project.common
	sts = new OSS.STS({
		accessKeyId: aliOSS.sts.accessKeyId,
		accessKeySecret: aliOSS.sts.accessKeySecret
	})
}

/**
 * 获取临时凭证
 * @param options 获取临时凭证的配置选项
 */
export default async (options: AliOSSCreateOptions = {}) => {
	const { aliOSS } = sys.conf.project.common
	if (!sts) getSts()
	const { expirationSeconds, policy, roleArn } = aliOSS.sts
	const result = await sts.assumeRole(roleArn, options.policy ?? policy, expirationSeconds, options.sessionName ?? '')
	return result.credentials
}
