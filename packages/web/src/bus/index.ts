import { Bus, type InterfaceToType } from 'event-imt'
import type { BusEvent } from './types'

export const bus = new Bus<InterfaceToType<BusEvent>>()
