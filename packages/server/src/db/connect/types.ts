import type { DbFit } from './index'
import type { RouterContext } from '@koa/router'
import Router from '@koa/router'
import type { Context, DefaultContext, DefaultState } from 'koa'

export interface DbFitOps {
	/** 查询模式, 默认为 execute */
	queryMode?: 'query' | 'execute'
	/** 借用已有实例, 实现共享操作|连接|事务 */
	borrow?: DbFit
	/**
	 * 传递上下文, 内部将监听上下文 error 和 success 事件, 当出现错误时, 自动回滚事务, 当成功时, 自动提交事务(提交事务推荐显示触发, 此项功能仅用于兜底操作)
	 * - 某些情况下你可能不希望拓展此功能, 那么你必须显示的传递 null
	 */
	ctx:
		Parameters<Parameters<Router['use']>[1]>[0] | RouterContext<DefaultState, DefaultContext, unknown> | Context | null
}
