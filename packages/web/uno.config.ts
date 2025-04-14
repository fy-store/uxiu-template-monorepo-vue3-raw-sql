import { defineConfig } from 'unocss'

export default defineConfig({
	presets: [],
	rules: [
		[/^w-([\.\d]+)$/, ([_, num]) => ({ width: `${num}px` })],
		[/^w-([\.\d]+)!$/, ([_, num]) => ({ width: `${num}px !important` })],
		[/^w-([\.\d]+)-p$/, ([_, num]) => ({ width: `${num}%` })],
		[/^min-w-([\.\d]+)$/, ([_, num]) => ({ 'min-width': `${num}px` })],
		[/^max-w-([\.\d]+)$/, ([_, num]) => ({ 'max-width': `${num}px` })],
		[/^vw-([\.\d]+)$/, ([_, num]) => ({ width: `${num}vw` })],
		[/^h-([\.\d]+)$/, ([_, num]) => ({ height: `${num}px` })],
		[/^h-([\.\d]+)!$/, ([_, num]) => ({ height: `${num}px !important` })],
		[/^h-([\.\d]+)-p$/, ([_, num]) => ({ height: `${num}%` })],
		[/^min-h-([\.\d]+)$/, ([_, num]) => ({ 'min-height': `${num}px` })],
		[/^max-h-([\.\d]+)$/, ([_, num]) => ({ 'max-height': `${num}px` })],
		[/^vh-([\.\d]+)$/, ([_, num]) => ({ height: `${num}vh` })],
		[/^mg-([\.\d]+)$/, ([_, num]) => ({ margin: `${num}px` })],
		[/^mt-([\.\d]+)$/, ([_, num]) => ({ 'margin-top': `${num}px` })],
		[/^mr-([\.\d]+)$/, ([_, num]) => ({ 'margin-right': `${num}px` })],
		[/^mb-([\.\d]+)$/, ([_, num]) => ({ 'margin-bottom': `${num}px` })],
		[/^ml-([\.\d]+)$/, ([_, num]) => ({ 'margin-left': `${num}px` })],
		[/^pd-([\.\d]+)$/, ([_, num]) => ({ padding: `${num}px` })],
		[/^pt-([\.\d]+)$/, ([_, num]) => ({ 'padding-top': `${num}px` })],
		[/^pr-([\.\d]+)$/, ([_, num]) => ({ 'padding-right': `${num}px` })],
		[/^pb-([\.\d]+)$/, ([_, num]) => ({ 'padding-bottom': `${num}px` })],
		[/^pl-([\.\d]+)$/, ([_, num]) => ({ 'padding-left': `${num}px` })],
		[/^f-([\.\d]+)$/, ([_, num]) => ({ 'font-size': `${num}px` })],
		[/^flex$/, () => ({ display: `flex` })],
		[/^flex-column$/, () => ({ display: `flex`, 'flex-direction': `column` })],
		[/^flex-([\d]+)$/, (info) => ({ flex: `${info[1]}` })],
		[/^flex-shrink-([\d]+)$/, (info) => ({ 'flex-shrink': `${info[1]}` })],
		[/^flex-center$/, () => ({ display: `flex`, 'justify-content': `center`, 'flex-wrap': 'wrap' })],
		[/^flex-start$/, () => ({ display: `flex`, 'justify-content': `flex-start`, 'flex-wrap': 'wrap' })],
		[/^flex-end$/, () => ({ display: `flex`, 'justify-content': `flex-end`, 'flex-wrap': 'wrap' })],
		[/^flex-space-between$/, () => ({ display: `flex`, 'justify-content': `space-between`, 'flex-wrap': 'wrap' })],
		[/^flex-align-center$/, () => ({ display: `flex`, 'align-items': `center`, 'flex-wrap': 'wrap' })],
		[/^flex-wrap$/, () => ({ 'flex-wrap': 'nwrap' })],
		[/^flex-no-wrap$/, () => ({ 'flex-wrap': 'no-wrap' })],
		[/^text-center$/, () => ({ 'text-align': 'center' })],
		[/^text-left$/, () => ({ 'text-align': 'left' })],
		[/^text-right$/, () => ({ 'text-align': 'right' })],
		[
			/^cursor-([a-zA-Z]+)$/,
			(info) => {
				return { cursor: `${info[1]}` }
			}
		],
		[/^position-relative$/, () => ({ position: 'relative' })],
		[/^position-absolute$/, () => ({ position: 'absolute' })],
		[/^position-fixed$/, () => ({ position: 'fixed' })],
		[/^position-sticky$/, () => ({ position: 'sticky' })],
		[/^z-index-([\d]+)$/, ([_, num]) => ({ 'z-index': `${num}` })],
		[/^top-([\.\d]+)$/, ([_, num]) => ({ top: `${num}px` })],
		[/^left-([\.\d]+)$/, ([_, num]) => ({ left: `${num}px` })],
		[/^right-([\.\d]+)$/, ([_, num]) => ({ right: `${num}px` })],
		[/^bottom-([\.\d]+)$/, ([_, num]) => ({ bottom: `${num}px` })],
		[/^top-([\.\d]+)-p$/, ([_, num]) => ({ top: `${num}%` })],
		[/^left-([\.\d]+)-p$/, ([_, num]) => ({ left: `${num}%` })],
		[/^right-([\.\d]+)-p$/, ([_, num]) => ({ right: `${num}%` })],
		[/^bottom-([\.\d]+)-p$/, ([_, num]) => ({ bottom: `${num}%` })],
		[
			/^translate-(([\-\.\d]+)_([\-\.\d]+))$/,
			([_info, num]) => {
				return {
					translate: num
						.split('_')
						.map((it) => `${it}px`)
						.join(' ')
				}
			}
		],
		[
			/^translate-(([\-\.\d]+)_([\-\.\d]+))-p$/,
			([_info, num]) => {
				return {
					translate: num
						.replace('-p', '')
						.split('_')
						.map((it) => `${it}%`)
						.join(' ')
				}
			}
		],
		[/^translate-x-([\-\.\d]+)$/, ([_, num]) => ({ transform: `translateX(${num}px)` })],
		[/^translate-y-([\-\.\d]+)$/, ([_, num]) => ({ transform: `translateY(${num}px)` })],
		[/^translate-x-([\-\.\d]+)-p$/, ([_, num]) => ({ transform: `translateX(${num}%)` })],
		[/^translate-y-([\-\.\d]+)-p$/, ([_, num]) => ({ transform: `translateY(${num}%)` })],
		[/^border-box$/, ([_, _num]) => ({ 'box-sizing': `border-box` })],
		[
			/^bg-([0-9a-fA-F]+)$/,
			(info) => {
				return { 'background-color': `#${info[1]}` }
			}
		],
		[
			/^radius-([\-\.\d]+)$/,
			(info, _num) => {
				return { 'border-radius': `${info[1]}px` }
			}
		],
		[
			/^radius-([\-\.\d]+)-p$/,
			(info, _num) => {
				return { 'border-radius': `${info[1]}%` }
			}
		]
	]
})
