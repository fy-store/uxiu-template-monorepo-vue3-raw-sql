import { z } from 'zod'

/** MySQL 保留关键字及系统库名集合，用于校验标识符是否与 MySQL 保留字冲突 */
const mysqlKeywordSet = new Set([
	'add',
	'alter',
	'and',
	'as',
	'by',
	'column',
	'create',
	'database',
	'delete',
	'desc',
	'drop',
	'from',
	'group',
	'index',
	'insert',
	'into',
	'join',
	'key',
	'like',
	'limit',
	'not',
	'null',
	'on',
	'or',
	'order',
	'primary',
	'schema',
	'select',
	'set',
	'table',
	'union',
	'unique',
	'update',
	'values',
	'where',
	'mysql',
	'information_schema',
	'performance_schema',
	'sys'
])

/** 标识符正则表达式：以小写字母开头，仅包含小写字母、数字和下划线 */
const identifierPattern = /^[a-z][a-z0-9_]*$/

/**
 * 名称校验 schema，用于校验数据库、表、字段等名称
 * - 长度限制为 1-64 个字符
 * - 仅包含小写字母、数字和下划线，且以小写字母开头
 * - 不能以下划线结尾
 * - 不能包含连续下划线
 * - 不能使用 MySQL 保留关键字或系统库名
 */
export const checkNameSchema = z
	.string()
	.min(1, '名称不能为空')
	.max(64, '名称长度不能超过 64 个字符')
	.refine((value) => value === value.trim(), {
		message: '名称不能包含首尾空白字符'
	})
	.refine((value) => identifierPattern.test(value), {
		message: '名称只能包含小写字母、数字和下划线，且必须以小写字母开头'
	})
	.refine((value) => !value.endsWith('_'), {
		message: '名称不能以下划线结尾'
	})
	.refine((value) => !value.includes('__'), {
		message: '名称不能包含连续下划线'
	})
	.refine((value) => !mysqlKeywordSet.has(value), {
		message: '名称不能使用 MySQL 保留关键字或系统库名'
	})

/**
 * 列索引 schema
 * - 简单形式：`'primaryKey' | 'unique' | 'index'`
 * - 对象形式：可额外指定索引类型、前缀长度(prefix，仅 varchar/char 支持)、生成列(generated)等
 */
const columnIndexSchema = z.union([
	z.enum(['primaryKey', 'unique', 'index']),
	z.object({
		/** 索引类型 */
		type: z.enum(['primaryKey', 'unique', 'index']),
		/**
		 * 前缀长度(仅 varchar/char 类型支持, 用于限制索引的字符数, 必须为不超过字段长度的正整数)
		 */
		prefix: z.number().int('前缀长度必须为整数').positive('前缀长度必须为正数').optional(),
		/** 生成列名（如果不指定会自动推导） */
		name: z.string().optional(),
		/** 生成列配置：当需要基于表达式创建索引时使用 */
		generated: z
			.object({
				/** 生成列的表达式（必需） */
				expression: z.string().min(1, '生成列表达式不能为空'),
				/** 是否为 STORED 生成列, true 写入磁盘, false 操作时计算，默认为 true */
				stored: z.boolean().optional()
			})
			.optional()
	})
])

/** 列类型枚举 */
const columnTypeSchema = z.enum(['bigint', 'int', 'tinyint', 'varchar', 'char', 'text', 'datetime', 'json'])

/** 日期值校验 schema，校验是否为有效 Date 对象 */
const dateValueSchema = z.date().refine((date) => !isNaN(date.getTime()), { message: '无效的日期' })

/**
 * bigint 类型字段 schema
 * 支持自增(autoIncrement)、索引(index)、默认值(default)等配置
 * 默认值可用 string 表示超大整数（bigint 不支持 JSON 序列化）
 */
export const bigintTypeSchema = z
	.object({
		/** 字段名 */
		name: z.string(),
		/** 字段类型 */
		type: z.literal('bigint'),
		/**
		 * - `primaryKey` 主键索引
		 * - `unique` 唯一索引
		 * - `index` 普通索引
		 */
		index: columnIndexSchema.optional(),
		/** 是否为自增字段, 需 `index` 为 'primaryKey' 才可设置为 true */
		autoIncrement: z.boolean().optional(),
		/** 是否允许为空, 默认为 false */
		allowNull: z.boolean().default(false).optional(),
		/** 默认值, allowNull 为 true 才可设置为 null, 可用 string 展示超大整数(bigint 不支持 json 序列化, 如需要请使用 string 表示) */
		default: z.union([z.bigint(), z.string(), z.null()]).optional(),
		/** 字段注释 */
		comment: z.string().optional()
	})
	.refine((val) => !(val.autoIncrement && val.index !== 'primaryKey'), {
		message: '自增字段需设置 index 为 primaryKey',
		path: ['autoIncrement']
	})
	.refine((val) => !(val.default === null && !val.allowNull), {
		message: 'allowNull 为 true 才可以设置 default 为 null',
		path: ['default']
	})

/**
 * int 类型字段 schema
 * 支持自增(autoIncrement)、索引(index)、默认值(default)等配置
 */
export const intTypeSchema = z
	.object({
		/** 字段名 */
		name: z.string(),
		/** 字段类型 */
		type: z.literal('int'),
		/**
		 * - `primaryKey` 主键索引
		 * - `unique` 唯一索引
		 * - `index` 普通索引
		 */
		index: columnIndexSchema.optional(),
		/** 是否为自增字段, 需 `index` 为 'primaryKey' 才可设置为 true */
		autoIncrement: z.boolean().optional(),
		/** 是否允许为空, 默认为 false */
		allowNull: z.boolean().default(false).optional(),
		/** 默认值, allowNull 为 true 才可设置为 null */
		default: z.union([z.number(), z.null()]).optional(),
		/** 字段注释 */
		comment: z.string().optional()
	})
	.refine((val) => !(val.autoIncrement && val.index !== 'primaryKey'), {
		message: '自增字段需设置 index 为 primaryKey',
		path: ['autoIncrement']
	})
	.refine((val) => !(val.default === null && !val.allowNull), {
		message: 'allowNull 为 true 才可以设置 default 为 null',
		path: ['default']
	})

/**
 * tinyint 类型字段 schema
 * 支持自增(autoIncrement)、索引(index)、默认值(default)等配置
 */
export const tinyIntTypeSchema = z
	.object({
		/** 字段名 */
		name: z.string(),
		/** 字段类型 */
		type: z.literal('tinyint'),
		/**
		 * - `primaryKey` 主键索引
		 * - `unique` 唯一索引
		 * - `index` 普通索引
		 */
		index: columnIndexSchema.optional(),
		/** 是否为自增字段, 需 `index` 为 'primaryKey' 才可设置为 true */
		autoIncrement: z.boolean().optional(),
		/** 是否允许为空, 默认为 false */
		allowNull: z.boolean().default(false).optional(),
		/** 默认值, allowNull 为 true 才可设置为 null */
		default: z.union([z.number(), z.null()]).optional(),
		/** 字段注释 */
		comment: z.string().optional()
	})
	.refine((val) => !(val.autoIncrement && val.index !== 'primaryKey'), {
		message: '自增字段需设置 index 为 primaryKey',
		path: ['autoIncrement']
	})
	.refine((val) => !(val.default === null && !val.allowNull), {
		message: 'allowNull 为 true 才可以设置 default 为 null',
		path: ['default']
	})

/**
 * varchar 类型字段 schema
 * 支持长度(length)、索引（含前缀 prefix）、默认值(default)等配置
 */
export const varcharTypeSchema = z
	.object({
		/** 字段名 */
		name: z.string(),
		/** 字段类型 */
		type: z.literal('varchar'),
		/**
		 * - `primaryKey` 主键索引
		 * - `unique` 唯一索引
		 * - `index` 普通索引
		 */
		index: columnIndexSchema.optional(),
		/** 字符串长度 */
		length: z.number(),
		/** 是否允许为空, 默认为 false */
		allowNull: z.boolean().default(false).optional(),
		/** 默认值, `allowNull` 为 true 才可设置为 null */
		default: z.union([z.string(), z.null()]).optional(),
		/** 字段注释 */
		comment: z.string().optional()
	})
	.refine((val) => !(val.default === null && !val.allowNull), {
		message: 'allowNull 为 true 才可以设置 default 为 null',
		path: ['default']
	})
	.refine(
		(val) => {
			if (typeof val.index === 'object' && val.index !== null && 'prefix' in val.index && val.index.prefix !== undefined) {
				return val.index.prefix <= val.length
			}
			return true
		},
		{
			message: '索引前缀长度(prefix)不能超过字段长度(length)',
			path: ['index']
		}
	)

/**
 * char 类型字段 schema
 * 支持长度(length)、索引（含前缀 prefix）、默认值(default)等配置
 */
export const charTypeSchema = z
	.object({
		/** 字段名 */
		name: z.string(),
		/** 字段类型 */
		type: z.literal('char'),
		/**
		 * - `primaryKey` 主键索引
		 * - `unique` 唯一索引
		 * - `index` 普通索引
		 */
		index: columnIndexSchema.optional(),
		/** 字符串长度 */
		length: z.number(),
		/** 是否允许为空, 默认为 false */
		allowNull: z.boolean().default(false).optional(),
		/** 默认值, `allowNull` 为 true 才可设置为 null */
		default: z.union([z.string(), z.null()]).optional(),
		/** 字段注释 */
		comment: z.string().optional()
	})
	.refine((val) => !(val.default === null && !val.allowNull), {
		message: 'allowNull 为 true 才可以设置 default 为 null',
		path: ['default']
	})
	.refine(
		(val) => {
			if (typeof val.index === 'object' && val.index !== null && 'prefix' in val.index && val.index.prefix !== undefined) {
				return val.index.prefix <= val.length
			}
			return true
		},
		{
			message: '索引前缀长度(prefix)不能超过字段长度(length)',
			path: ['index']
		}
	)

/**
 * text 类型字段 schema
 * 不支持索引和默认值
 */
export const textTypeSchema = z.object({
	/** 字段名 */
	name: z.string(),
	/** 字段类型 */
	type: z.literal('text'),
	/** 是否允许为空, 默认为 false */
	allowNull: z.boolean().default(false).optional(),
	/** 字段注释 */
	comment: z.string().optional()
})

/**
 * datetime 类型字段 schema
 * 支持索引(index)、默认值(default，含 `current_timestamp`)、onUpdate 等配置
 */
export const dateTimeTypeSchema = z
	.object({
		/** 字段名 */
		name: z.string(),
		/** 字段类型 */
		type: z.literal('datetime'),
		/**
		 * - `primaryKey` 主键索引
		 * - `unique` 唯一索引
		 * - `index` 普通索引
		 */
		index: columnIndexSchema.optional(),
		/** 是否允许为空, 默认为 false */
		allowNull: z.boolean().default(false).optional(),
		/** 默认值, `allowNull` 为 true 才可设置为 null, 使用 Date 时序列化会转为 UTC 字符串 */
		default: z.union([z.literal('current_timestamp'), z.string(), dateValueSchema, z.null()]).optional(),
		/** 当该条数据更新时是否自动更新 (常用于 datetime/timestamp 类型的 on update current_timestamp) */
		onUpdate: z.literal('current_timestamp').optional(),
		/** 字段注释 */
		comment: z.string().optional()
	})
	.refine((val) => !(val.default === null && !val.allowNull), {
		message: 'allowNull 为 true 才可以设置 default 为 null',
		path: ['default']
	})

/**
 * json 类型字段 schema
 * 不支持索引和默认值
 */
export const jsonTypeSchema = z.object({
	/** 字段名 */
	name: z.string(),
	/** 字段类型 */
	type: z.literal('json'),
	/** 是否允许为空, 默认为 false */
	allowNull: z.boolean().default(false).optional(),
	/** 字段注释 */
	comment: z.string().optional()
})

/**
 * 字段 schema 联合类型，包含所有支持的字段类型（bigint、int、tinyint、varchar、char、text、datetime、json）
 */
export const columnSchema = z.union([
	bigintTypeSchema,
	intTypeSchema,
	tinyIntTypeSchema,
	varcharTypeSchema,
	charTypeSchema,
	textTypeSchema,
	dateTimeTypeSchema,
	jsonTypeSchema
])

/**
 * 更新字段项 schema
 * 支持重命名(oldName)、修改类型(type)、索引(index)、默认值(default)等
 * 至少需要提供 oldName 或 name
 */
export const updateColumnItemSchema = z
	.object({
		/** 原字段名（用于重命名） */
		oldName: checkNameSchema.optional(),
		/** 新字段名 */
		name: checkNameSchema.optional(),
		/** 新的字段类型 */
		type: columnTypeSchema.optional(),
		/** 新的索引配置 */
		index: columnIndexSchema.optional(),
		/** 是否自增 */
		autoIncrement: z.boolean().optional(),
		/** 是否允许为空 */
		allowNull: z.boolean().optional(),
		/** 新的默认值 */
		default: z
			.union([z.bigint(), z.number(), z.string(), dateValueSchema, z.literal('current_timestamp'), z.null()])
			.optional(),
		/** 字段注释 */
		comment: z.string().optional(),
		/** 字段长度（varchar/char 类型适用） */
		length: z.number().optional(),
		/** 更新时自动设置时间戳 */
		onUpdate: z.literal('current_timestamp').optional()
	})
	.refine((val) => Boolean(val.oldName || val.name), {
		message: 'oldName 和 name 至少传一个',
		path: ['name']
	})

/**
 * 创建表的 options schema
 */
export const createTableOptionsSchema = z.object({
	/** 数据库名称 */
	databaseName: checkNameSchema,
	/** 表名 */
	tableName: checkNameSchema,
	/** 字段列表 */
	columns: z.array(columnSchema).min(1),
	/** 表注释 */
	comment: z.string().optional()
})

/**
 * 新增列的 options schema
 */
export const createColumnOptionsSchema = z.object({
	/** 数据库名称 */
	databaseName: checkNameSchema,
	/** 表名 */
	tableName: checkNameSchema,
	/** 字段列表 */
	columns: z.array(columnSchema).min(1)
})

/**
 * 修改列的 options schema
 */
export const updateColumnOptionsSchema = z.object({
	/** 数据库名称 */
	databaseName: checkNameSchema,
	/** 表名 */
	tableName: checkNameSchema,
	/** 字段列表 */
	columns: z.array(updateColumnItemSchema).min(1)
})

/**
 * 定义表的 options schema（同创建表）
 */
export const defineTableOptionsSchema = z.object({
	/** 数据库名称 */
	databaseName: checkNameSchema,
	/** 表名 */
	tableName: checkNameSchema,
	/** 字段列表 */
	columns: z.array(columnSchema).min(1),
	/** 表注释 */
	comment: z.string().optional()
})
