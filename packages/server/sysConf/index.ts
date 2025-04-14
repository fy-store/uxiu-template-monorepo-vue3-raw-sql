import type { Mysql, Project } from './types/index.js'
import { readonly } from 'uxiu'
import yaml from 'js-yaml'
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const project = readonly(
	yaml.load(fs.readFileSync(path.join(root, './sysConf/modules/project.yaml')).toString()) as Project
)
const mysql = readonly(yaml.load(fs.readFileSync(path.join(root, './sysConf/modules/mysql.yaml')).toString()) as Mysql)

const config = readonly({
	mysql,
	project
})

export { mysql, project }
export default config
