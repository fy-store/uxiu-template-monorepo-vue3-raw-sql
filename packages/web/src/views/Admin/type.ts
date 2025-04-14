import type { UpdateAdmin } from '@t/index'

export type SearchParams = {
	name?: string
}

export type EditFormData = {
	id: number
} & UpdateAdmin
