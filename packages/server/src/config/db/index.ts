import { sys } from '@server/config/sys'
import { defineTables, tableDefineToMap } from './utils'

const { database } = sys.config.mysql.connect

export const tableName = Object.freeze({
	ADMIN: 'admin',
	SESSION_INFO: 'session_info',
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
				length: 200,
				comment: '登录密码'
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
	}
])

export const tableMap = tableDefineToMap(tableOptions)
