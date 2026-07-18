import fs from 'node:fs/promises'
import path from 'node:path/posix'
import multer from '@koa/multer'
import { defineCheckError, getWebURL } from '@server/utils'
import { fileStorage } from '@server/common'
import { uploadFileParamsSchema } from './schema'
import { sys } from '@server/config'
import { Router } from '@koa/router'

export const uploadFileRouter = new Router()
const fileConfig = sys.config.common.fileStorage
const tempDirPath = path.join(sys.rootPath, fileConfig.tempPath)

// 没有扩展名的文件需特殊处理
// 文档: https://github.com/expressjs/multer/blob/main/doc/README-zh-cn.md
// 此处将文件放置到临时目录中
const upload = multer({
	storage: multer.diskStorage({
		async filename(_req, file, callback) {
			const ext = path.extname(file.originalname)
			const isLegal = fileStorage.isLegalCharacter(ext)
			const filename = await fileStorage.createUniqueFilename(tempDirPath, ext)
			callback(isLegal ? null : new Error(`文件类型包含非法字符: ${ext}`), filename)
		},
		async destination(_req, file, callback) {
			// 按不同扩展名创建不同的临时目录
			const ext = path.extname(file.originalname)
			const dirName = ext ? path.join(tempDirPath, ext.slice(1)) : path.join(tempDirPath, fileConfig.emptyExt.slice(1))
			const isLegal = fileStorage.isLegalCharacter(dirName)
			await fs.mkdir(dirName, { recursive: true })
			callback(isLegal ? null : new Error(`文件名包含非法字符: ${dirName}`), dirName)
		}
	}),
	limits: {
		fieldSize: fileConfig.fieldSize,
		fields: fileConfig.fields,
		files: 1
	},
	fileFilter(req, file, callback) {
		type Ext = (typeof fileConfig.allowedExt)[number]
		const ext = path.extname(file.originalname) as Ext | ''
		if (ext === '' || fileConfig.allowedExt.includes(ext)) {
			callback(null, true)
		} else {
			const error = new Error(`不支持的文件类型: ${path.extname(file.originalname)}`)
			// @ts-ignore
			req.customError = error
			callback(error, false)
		}
	}
})

// 普通文件上传
uploadFileRouter.post('/uploadFile', upload.single('file'), async (ctx) => {
	if (!ctx.file) {
		ctx.body = {
			code: 1,
			msg: '请上传文件'
		}
		return
	}

	const q = uploadFileParamsSchema.safeParse(ctx.request.body)
	if (!q.success) {
		ctx.body = defineCheckError(q.error)
		return
	}

	const isPrivate = q.data.isPrivate
	const ext = path.extname(ctx.file.filename).slice(1)
	let storageFilename: string
	if (isPrivate) {
		const info = await fileStorage.moveFileToPrivateStorage(
			path.join(tempDirPath, ext || fileConfig.emptyExt.slice(1), ctx.file.filename)
		)
		storageFilename = info.name
	} else {
		const info = await fileStorage.moveFileToPublicStorage(
			path.join(tempDirPath, ext || fileConfig.emptyExt.slice(1), ctx.file.filename)
		)
		storageFilename = info.name
	}
	const relativeUrl = fileStorage.pathJoin(
		'/',
		fileConfig.storagePath,
		isPrivate ? fileStorage.storageName.PRIVATE_STORAGE_NAME : fileStorage.storageName.PUBLIC_STORAGE_NAME,
		storageFilename
	)

	ctx.body = {
		code: 0,
		msg: '上传成功',
		data: {
			url: getWebURL(relativeUrl)
		}
	}
})
