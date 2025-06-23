const { name } = sys.conf.mysql.tables.userSession
const { sessionIdLength } = sys.conf.mysql.tables.userSession.fields

export default /*sql*/ `
create table if not exists ${name} (
    \`id\` int auto_increment primary key,
    \`session_id\` varchar(${sessionIdLength}) not null,
    \`session_value\` json not null,
    \`create_time\` datetime default current_timestamp,
    \`update_time\` datetime default current_timestamp on update current_timestamp,
    \`delete_time\` datetime default null,
    index index_session_id (\`session_id\`),
    index index_create_time (\`create_time\`),
    index index_update_time (\`update_time\`),
    index index_delete_time (\`delete_time\`)
)
`
