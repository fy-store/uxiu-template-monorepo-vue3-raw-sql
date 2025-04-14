import '@/style/index.scss'
import 'virtual:uno.css'
import * as conf from './conf'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { rangeDrag } from '@/instructs'

import App from './App.vue'
import router from './router'

const app = createApp(App)
app.provide('conf', conf)
app.directive('rDrag', rangeDrag)
app.use(createPinia())
app.use(router)

app.mount('#app')

/**
 * todo:
 * 1. 编写路由拦截, 未登录 跳转到登录页, 登录过期 弹窗提示并可重新验证登录
 * 重新验证登录流程:
 *  1. 当后端返回登录过期时, 判断本次请求 token 和 本地的 token 是否一致(防止token已经刷新, 当该请求在 [等待重试] 队列完成后才响应完成)
 *  - 如果一致, 将本次请求插入 [等待重试] 队列中, 随后执行下一条规则
 *  - 如果不一致, 使用新 token 重发本次请求, 不再执行后续规则
 *  2. 全局弹窗提示(单例), 并提供重新验证身份功能
 *  3. 验证通过, 将 [等待重试] 队列中的请求重新发送, 清空 [等待重试] 队列
 */
