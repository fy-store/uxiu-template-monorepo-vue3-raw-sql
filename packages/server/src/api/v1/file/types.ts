import { z } from 'zod'
import { uploadFileParamsSchema } from './schema'

/** 上传文件 */
export type UploadFileParams = z.infer<typeof uploadFileParamsSchema>
