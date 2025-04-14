const { name } = $.sysConf.mysql.tables.admin
const { nameLength, passwordLength, accountLength } = $.sysConf.mysql.tables.admin.fields

export default /*sql*/ `
create table if not exists ${name} (
    id int auto_increment primary key,
    name varchar(${nameLength}) not null,
    account varchar(${accountLength}) not null,
    password varchar(${passwordLength}) not null,
    authority json not null,
    is_super tinyint(1) not null default 0,
    create_time datetime default current_timestamp,
    update_time datetime default current_timestamp on update current_timestamp,
    delete_time datetime default null,
    index index_name (name),
    index index_account (account),
    index index_create_time (create_time),
    index index_update_time (update_time),
    index index_delete_time (delete_time)
)
`
