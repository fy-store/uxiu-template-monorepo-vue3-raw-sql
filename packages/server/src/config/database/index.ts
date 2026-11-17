import { sys } from '@server/config/system'
import { defineTables, tableDefineToMap } from './utils'
export * from './utils'
export type * from './types'

const { database } = sys.config.mysql.connect

export const tableName = Object.freeze({
	ADMIN: 'admin',
	ADMIN_CONFIG: 'admin_config',
	SESSION_INFO: 'session_info',
	API_CLIENT: 'api_client'
})

export const tableOptions = defineTables([
	{
		databaseName: database,
		tableName: tableName.SESSION_INFO,
		comment: '会话表',
		columns: [
			{
				name: 'id',
				type: 'varchar',
				length: 200,
				index: 'primaryKey',
				comment: '会话 ID'
			},
			{
				name: 'value',
				type: 'json',
				comment: '会话数据'
			},
			{
				name: 'create_time',
				type: 'datetime',
				default: 'current_timestamp',
				comment: '创建时间',
				index: 'index'
			},
			{
				name: 'update_time',
				type: 'datetime',
				allowNull: true,
				comment: '更新时间'
			},
			{
				name: 'delete_time',
				type: 'datetime',
				allowNull: true,
				comment: '删除时间',
				index: 'index'
			}
		]
	},
	{
		databaseName: database,
		tableName: tableName.ADMIN,
		comment: '管理员表',
		columns: [
			{
				name: 'id',
				type: 'int',
				index: 'primaryKey',
				autoIncrement: true
			},
			{
				name: 'name',
				type: 'varchar',
				length: 10,
				comment: '管理员名称',
				index: 'index'
			},
			{
				name: 'account',
				type: 'varchar',
				length: 20,
				comment: '登录账号',
				index: 'index'
			},
			{
				name: 'password',
				type: 'varchar',
				length: 255,
				comment: '登录密码(存储哈希值)'
			},
			{
				name: 'is_super',
				type: 'tinyint',
				comment: '是否超级管理员，0 否, 1 是',
				default: 0,
				index: 'index'
			},
			{
				name: 'authority',
				type: 'json',
				comment: '权限配置'
			},
			{
				name: 'remark',
				type: 'varchar',
				length: 500,
				comment: '备注(仅超管可用, 可见)'
			},
			{
				name: 'create_time',
				type: 'datetime',
				comment: '创建时间',
				default: 'current_timestamp'
			},
			{
				name: 'update_time',
				type: 'datetime',
				allowNull: true,
				comment: '更新时间'
			},
			{
				name: 'delete_time',
				type: 'datetime',
				comment: '删除时间',
				allowNull: true,
				index: 'index'
			}
		]
	},
	{
		databaseName: database,
		tableName: tableName.ADMIN_CONFIG,
		comment: '管理员个性化配置表',
		columns: [
			{
				name: 'id',
				type: 'int',
				index: 'primaryKey',
				autoIncrement: true
			},
			{
				name: 'admin_id',
				type: 'int',
				comment: '管理员 ID',
				index: 'unique'
			},
			{
				name: 'value',
				type: 'json',
				comment: '个性化配置'
			},
			{
				name: 'create_time',
				type: 'datetime',
				comment: '创建时间',
				default: 'current_timestamp'
			},
			{
				name: 'update_time',
				type: 'datetime',
				allowNull: true,
				comment: '更新时间'
			},
			{
				name: 'delete_time',
				type: 'datetime',
				allowNull: true,
				comment: '删除时间',
				index: 'index'
			}
		]
	},
	{
		databaseName: database,
		tableName: tableName.API_CLIENT,
		comment: 'API 客户端表',
		columns: [
			{
				name: 'id',
				type: 'int',
				index: 'primaryKey',
				autoIncrement: true
			},
			{
				name: 'name',
				type: 'varchar',
				length: 50,
				comment: '客户端名称',
				index: 'index'
			},
			{
				name: 'remark',
				type: 'varchar',
				length: 500,
				default: '',
				comment: '备注'
			},
			{
				name: 'permissions',
				type: 'json',
				comment: '权限配置, 增删改查四种权限的组合'
			},
			{
				name: 'key_id',
				type: 'varchar',
				length: 64,
				comment: '授权密钥标识',
				index: 'unique'
			},
			{
				name: 'key_hash',
				type: 'varchar',
				length: 64,
				comment: '授权密钥的 SHA-256 值'
			},
			{
				name: 'is_enabled',
				type: 'tinyint',
				default: 1,
				comment: '是否启用，0 否, 1 是',
				index: 'index'
			},
			{
				name: 'expire_time',
				type: 'datetime',
				allowNull: true,
				comment: '过期时间, 为空表示永久有效'
			},
			{
				name: 'create_time',
				type: 'datetime',
				default: 'current_timestamp',
				comment: '创建时间',
				index: 'index'
			},
			{
				name: 'update_time',
				type: 'datetime',
				allowNull: true,
				comment: '更新时间'
			},
			{
				name: 'delete_time',
				type: 'datetime',
				allowNull: true,
				comment: '删除时间',
				index: 'index'
			}
		]
	}
])

export const tableMap = tableDefineToMap(tableOptions)
