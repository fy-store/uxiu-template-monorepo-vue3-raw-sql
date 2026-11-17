import './polyfill.ts'
import 'virtual:uno.css'
import '@/config'
import '@/styles/index.scss'
import { init } from '@/init'
import { bus } from '@/bus'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { rangeDrag } from '@/frame/instructs/index.ts'

import App from './App.vue'
import router from './router'

const app = createApp(App)
app.directive('r-drag', rangeDrag)
app.use(createPinia())
app.use(router)

init().then(() => {
	app.mount('#app')
	bus.emit('app:mounted', app)
})
