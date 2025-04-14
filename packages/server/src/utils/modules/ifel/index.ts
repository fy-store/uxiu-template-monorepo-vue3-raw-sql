type MaybeFunction<T, C> = T | ((value: C) => T)

/**
 * 条件分支
 * @param condition 条件
 * @param truthy 当条件为真时返回, 若 `truthy` 参数为函数时, 会传入条件值作为参数, 并将结果返回
 * @param falsy 当条件为假时返回, 若 `falsy` 参数为函数时, 会传入条件值作为参数, 并将结果返回
 * @returns `truthy` 或 `falsy` 的结果
 */
export function ifel<T, F = '', C = any>(
	condition: C,
	truthy: MaybeFunction<T, C>,
	falsy: MaybeFunction<F, C> = '' as const as F
): T | F {
	if (Boolean(condition)) {
		return typeof truthy === 'function' ? (truthy as (value: C) => T)(condition) : truthy
	}
	return typeof falsy === 'function' ? (falsy as (value: C) => F)(condition) : falsy
}
