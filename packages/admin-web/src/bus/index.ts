import { Bus, type InterfaceToType } from 'event-imt'
import type { BusEvent } from './types'

export const busEventName = {
	/** 应用挂载完成 */
	APP_MOUNTED: 'app:mounted',
	/** 登录成功 */
	LOGINED_SUCCESS: 'logined:success'
} as const satisfies Record<string, keyof BusEvent>

export const bus = new Bus<InterfaceToType<BusEvent>>()
