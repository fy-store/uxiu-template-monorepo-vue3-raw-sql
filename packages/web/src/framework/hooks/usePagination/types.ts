import type { ElPagination } from 'element-plus'

export interface Options {
	/**
	 * 传递给 el-pagination 的 page-sizes
	 * - 默认值: [1, 10, 20, 30, 40, 50, 100, 200, 300, 400, 500, 1000, 1500, 2000]
	 */
	pageSizes?: number[]
	/**
	 * 传递给 el-pagination 的 layout
	 * - 默认值: 'total, sizes, prev, pager, next, jumper'
	 */
	layout?: string
	/** 是否立即触发一次获取列表, 默认为 true (触发是异步的) */
	immediate?: boolean
	/** 页面缓存后触发 activated 钩子时是否触发查询, 默认为 true */
	activatedEmit?: boolean
	/**
	 * 查询列表的方法，可在此处传递，也可通过返回值的事件总线监听 change 事件。
	 * @param args change 事件传入的分页配置等参数。
	 * @returns 查询结果，支持同步或异步返回。
	 */
	getList?: (...args: any[]) => any
	/** 分页配置, 切换时将实时更新此项配置 */
	pagingConfig?: {
		page: number
		size: number
		count: number
	}
	/** 直接传递给  el-pagination 的参数, 将覆盖默认参数 */
	paginationProps?: InstanceType<typeof ElPagination>['$props']
	/** 直接传递给  el-pagination 的事件, 将覆盖默认事件 */
	paginationEvents?: InstanceType<typeof ElPagination>['$emit']
	/** 自定义类名 */
	customClass?: string | Object | string[]
}

type RequiredKeys = 'pageSizes' | 'layout' | 'immediate' | 'activatedEmit' | 'pagingConfig'

export type Config = Omit<Options, RequiredKeys> & Required<Pick<Options, RequiredKeys>>

export interface EventTypes {
	/**
	 * 分页参数变化时触发。
	 * @param pagingConfig 当前分页配置。
	 */
	change?: (pagingConfig: Config['pagingConfig']) => void
}
