import mysql from 'mysql2/promise'

export default async () => {
	const { host, user, port, password, database } = $.sysConf.mysql.connect
	const connection = await mysql.createConnection({
		host,
		user,
		port,
		password
	})
	await connection.query(
		`create database if not exists ${database} default character set utf8mb4 default collate utf8mb4_bin`
	)
	await connection.end()
}
