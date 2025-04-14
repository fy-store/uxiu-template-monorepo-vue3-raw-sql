import type { Directive } from 'vue'

export const rangeDrag: Directive = {
	mounted(el: HTMLElement) {
		el.addEventListener('mousedown', handleMouseDown)
		el.addEventListener('touchstart', handleTouchStart, { passive: false })
	},

	unmounted(el: HTMLElement) {
		el.removeEventListener('mousedown', handleMouseDown)
		el.removeEventListener('touchstart', handleTouchStart)
	}
}

const handleMouseDown = (e: MouseEvent) => {
	startDrag(e, e.clientX)
}

const handleTouchStart = (e: TouchEvent) => {
	if (e.touches.length > 1) return
	startDrag(e, e.touches[0].clientX)
	e.preventDefault()
}

const startDrag = (event: Event, startX: number) => {
	const el = event.currentTarget as HTMLElement
	if (!(el instanceof HTMLElement)) {
		throw new Error('el not a HTMLElement')
	}
	const parent = el.parentElement
	if (!(parent instanceof HTMLElement)) {
		throw new Error('parent not a HTMLElement')
	}
	const parentInfo = window.getComputedStyle(parent)
	const { width, translate } = window.getComputedStyle(el)
	const translateX = getTranslateX(translate === 'none' ? '0px' : translate)

	const moveHandler = (moveEvent: MouseEvent | TouchEvent) => {
		const clientX = moveEvent instanceof MouseEvent ? moveEvent.clientX : moveEvent.touches[0].clientX
		const diffX = clientX - startX
		let result = translateX + diffX
		if (result > 0) {
			result = 0
		} else {
			const w = Number.parseFloat(width)
			const pW = Number.parseFloat(parentInfo.width)
			if (w > pW) {
				const maxWidth = pW - w
				if (result < maxWidth) {
					result = maxWidth
				}
			} else {
				result = 0
			}
		}
		el.style.translate = `${result}px 0`
	}

	const endHandler = () => {
		document.removeEventListener('mousemove', moveHandler)
		document.removeEventListener('mouseup', endHandler)
		document.removeEventListener('touchmove', moveHandler)
		document.removeEventListener('touchend', endHandler)
	}

	document.addEventListener('mousemove', moveHandler)
	document.addEventListener('mouseup', endHandler)
	document.addEventListener('touchmove', moveHandler, { passive: false })
	document.addEventListener('touchend', endHandler)
}

// 获取元素的 translateX
const getTranslateX = (translate: string): number => {
	const match = translate.match(/(-?[\.\d]+)px/)
	return match ? Number(match[1]) : 0
}
