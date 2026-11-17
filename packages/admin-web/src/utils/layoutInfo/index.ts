import type { Direction } from './types'

export class LayoutInfo {
	private _element: HTMLElement

	constructor(element: HTMLElement) {
		this._element = element
	}

	/**
	 * 获取元素到页面某一边的距离
	 * - 不使用 getBoundingClientRect, 因为有些场景下不符合需求
	 * @param direction 方位
	 */
	getPageDistance(direction: Direction): number {
		let distance = 0
		let currentEl: HTMLElement | null = this._element
		const offsetProp = (() => {
			if (direction === 'top') return 'offsetTop'
			if (direction === 'bottom') return 'offsetHeight'
			if (direction === 'left') return 'offsetLeft'
			if (direction === 'right') return 'offsetWidth'
			throw new Error('Invalid direction')
		})()
		while (currentEl) {
			distance += currentEl[offsetProp]
			currentEl = currentEl.offsetParent as HTMLElement | null
		}
		return distance
	}
}
