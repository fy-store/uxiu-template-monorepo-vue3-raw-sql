export interface Return<T = any> {
	code: 0 | 1 | -1 | 403 | 404 | 500
	msg: string
	data?: T
}

export interface PromiseReturn<T = void> extends Promise<Return<T>> {}
