# 启动和部署须知

1. 当前项目依赖: `nodejs` >= 24+ , `mysql` >= 8.0+

2. 当前项目为 `monorepo` 项目, 所以推荐使用 `pnpm` 来管理和安装依赖.

3. 在 `packages\server\sys.config.ts` 中 `mysql` 字段中配置数据库连接信息.

4. 使用 `pnpm dev:server` 启动后端服务. 使用 `pnpm dev:web` 启动前端服务. `pnpm dev` 启动所有服务, 某些环境无法正常启动(不推荐).

5. 使用 `pnpm init:db` 初始化数据库.

6. 使用 `pnpm init:root` 初始化初始管理员.

7. 在部署到正式环境后请更新 `packages\server\sys.config.ts` 中 `mysql` , `cookieKeys` , `symmetryEncipher` , `asymmetricEncipher` 中的敏感信息.

8. 打包后部署需要自行配置 `nginx` 等代理服务器, 如将请求转发到后端指定端口路径下, 配置前端资源指向 `public` , 并配置 HTTPS 证书等.
