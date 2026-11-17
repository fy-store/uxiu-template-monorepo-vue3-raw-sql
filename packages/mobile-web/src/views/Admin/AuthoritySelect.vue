<template>
	<div class="authority-select flex flex-col">
		<div
			v-for="item in flatNodes"
			:key="item.node.id"
			class="authority-select__node"
			:class="{ 'authority-select__node--preview': readonly }"
			:style="{ paddingLeft: `${item.depth * 16}px` }"
		>
			<!-- 只读预览: 不展示勾选框, 已授权项以行尾标记区分 -->
			<template v-if="readonly">
				<span class="authority-select__name">{{ item.node.name }}</span>
				<var-icon
					v-if="checkedSet.has(item.node.id)"
					name="check"
					:size="16"
					class="authority-select__mark"
				/>
			</template>
			<var-checkbox
				v-else
				:model-value="checkedSet.has(item.node.id)"
				:indeterminate="indeterminateSet.has(item.node.id)"
				@update:model-value="toggle(item.node, Boolean($event))"
			>
				{{ item.node.name }}
			</var-checkbox>
		</div>
	</div>
</template>

<script lang="ts" setup>
	import type { Authority } from '@server/api/v1/authority'
	import { computed } from 'vue'

	/** 扁平化后的权限节点, depth 用于缩进展示层级 */
	interface FlatNode {
		node: Authority
		depth: number
	}

	const props = defineProps<{
		/** 已勾选的权限 id 列表 */
		modelValue?: string[]
		/** 权限树 */
		options: Authority[]
		/** 只读模式仅展示勾选状态 */
		readonly?: boolean
	}>()
	const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

	const checkedSet = computed(() => new Set(props.modelValue ?? []))

	/** 深度优先展开权限树 */
	const flatNodes = computed(() => {
		const result: FlatNode[] = []
		function walk(nodes: Authority[], depth: number) {
			for (const node of nodes) {
				result.push({ node, depth })
				if (node.children?.length) walk(node.children, depth + 1)
			}
		}
		walk(props.options, 0)
		return result
	})

	/** 计算节点的全部后代 id (不含自身) */
	function getDescendantIds(node: Authority) {
		const ids: string[] = []
		function walk(current: Authority) {
			for (const child of current.children ?? []) {
				ids.push(child.id)
				walk(child)
			}
		}
		walk(node)
		return ids
	}

	/** 子节点部分勾选时展示半选状态 */
	const indeterminateSet = computed(() => {
		const set = new Set<string>()
		function walk(nodes: Authority[]) {
			for (const node of nodes) {
				if (!node.children?.length) continue
				walk(node.children)
				const descendantIds = getDescendantIds(node)
				const checkedCount = descendantIds.filter((id) => checkedSet.value.has(id)).length
				if (checkedCount > 0 && checkedCount < descendantIds.length) {
					set.add(node.id)
				}
			}
		}
		walk(props.options)
		return set
	})

	/**
	 * 切换节点勾选状态, 勾选/取消会级联整个子树。
	 * @param node 被切换的节点。
	 * @param checked 切换后的勾选状态。
	 */
	function toggle(node: Authority, checked: boolean) {
		if (props.readonly) return
		const next = new Set(props.modelValue ?? [])
		const subtreeIds = [node.id, ...getDescendantIds(node)]
		for (const id of subtreeIds) {
			if (checked) next.add(id)
			else next.delete(id)
		}
		normalize(next, props.options)
		emit('update:modelValue', Array.from(next))
	}

	/**
	 * 自底向上同步父节点状态: 子节点全部勾选时勾选父节点, 否则取消父节点。
	 * @param set 当前勾选集合, 会被原地修改。
	 * @param nodes 待同步的权限树层级。
	 */
	function normalize(set: Set<string>, nodes: Authority[]) {
		for (const node of nodes) {
			if (!node.children?.length) continue
			normalize(set, node.children)
			if (node.children.every((child) => set.has(child.id))) {
				set.add(node.id)
			} else {
				set.delete(node.id)
			}
		}
	}
</script>

<style scoped lang="scss">
	.authority-select {
		max-height: 300px;
		overflow-y: auto;
		padding: 8px 12px;
		border: 1px solid var(--color-outline);
		border-radius: 8px;
	}

	/* 填充父容器剩余高度, 滚动交给列表内部 */
	.authority-select--fill {
		flex: 1;
		min-height: 0;
		max-height: none;
	}

	.authority-select__node {
		padding: 2px 0;
	}

	/* 只读预览行: 文本 + 授权标记 */
	.authority-select__node--preview {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 7px 0;
	}

	.authority-select__name {
		flex: 1;
		min-width: 0;
		font-size: 14px;
		line-height: 20px;
		word-break: break-all;
	}

	.authority-select__mark {
		flex-shrink: 0;
		color: var(--theme-color-primary);
	}
</style>
