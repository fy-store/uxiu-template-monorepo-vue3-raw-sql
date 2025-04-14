import type { Return } from './utils/type'
import type { Authority, IsSuperSelect } from '@t/index'
import { request } from './utils/request'

export const getAuthoritySelect = (): Promise<Return<Authority[]>> => request.get('getAuthoritySelect')

export const getIsSuperSelect = (): Promise<Return<IsSuperSelect>> => request.get('getIsSuperSelect')
