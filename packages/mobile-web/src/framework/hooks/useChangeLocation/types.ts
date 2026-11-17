import type { MaybeRefOrGetter } from 'vue'

export interface Options {
	/** 是否启用地址同步, 默认为 true; 传入 getter 支持响应式切换 */
	enabled?: MaybeRefOrGetter<boolean>
}
