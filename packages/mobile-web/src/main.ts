import './polyfill.ts'
import 'virtual:uno.css'
import '@/config'
import '@/styles/index.scss'
import { init } from '@/init'
import { bus, busEventName } from '@/bus'
import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

// 桌面端开发时模拟触摸事件, 便于调试移动端交互
if (import.meta.env.DEV) {
	import('@varlet/touch-emulator')
}

const app = createApp(App)
app.use(createPinia())
app.use(router)

init().then(() => {
	app.mount('#app')
	bus.emit(busEventName.APP_MOUNTED, app)
})
