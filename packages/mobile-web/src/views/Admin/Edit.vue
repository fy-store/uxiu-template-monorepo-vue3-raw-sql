<template>
	<Popup v-model:show="visible" url-key="editAdmin" position="bottom" :default-style="false" @open="initFormData">
		<var-form class="form-popup" @submit="submit">
			<div class="form-popup__header">
				<span>编辑管理员</span>
				<var-button text round @click="visible = false">
					<var-icon name="window-close" />
				</var-button>
			</div>
			<div class="form-popup__body">
				<div class="form-field">
					<div class="form-field__label">管理员名称</div>
					<var-input
						v-model="formData.name"
						placeholder="请输入管理员名称"
						:rules="[(v: string) => !!v || '请输入管理员名称']"
					/>
				</div>
				<div class="form-field">
					<div class="form-field__label">管理员密码</div>
					<var-input
						v-model="formData.password"
						type="password"
						placeholder="留空表示不修改密码"
						clearable
						:rules="[passwordRule]"
					/>
				</div>
				<div class="form-field" v-if="userInfo.info?.isSuper">
					<div class="form-field__label">是否为超管</div>
					<var-select v-model="formData.isSuper" placeholder="请选择" :options="isSuperOptions" />
				</div>
				<div class="form-field" v-if="!formData.isSuper">
					<div class="form-field__label">管理员权限</div>
					<AuthoritySelect v-model="formData.authority" :options="authorityOptions" />
				</div>
				<div class="form-field" v-else>
					<div class="form-field__label">管理员权限</div>
					<div class="form-field__tip">超级管理员默认拥有全部权限，无需勾选</div>
				</div>
				<div class="form-field" v-if="userInfo.info?.isSuper">
					<div class="form-field__label">备注</div>
					<var-input v-model="formData.remark" textarea :rows="3" placeholder="请输入备注" />
				</div>
			</div>
			<div class="form-popup__footer">
				<var-button block @click="visible = false">取 消</var-button>
				<var-button block type="primary" native-type="submit" :loading="submitting">提交表单</var-button>
			</div>
		</var-form>
	</Popup>
</template>

<script lang="ts" setup>
	import type { Admin, UpdateAdminParams } from '@server/api/v1/admin'
	import type { Authority } from '@server/api/v1/authority'
	import { ref } from 'vue'
	import Popup from '@/framework/components/Popup/index.vue'
	import { admin, account } from '@/api'
	import { useUserInfo } from '@/stores'
	import { message } from '@/framework/utils'
	import AuthoritySelect from './AuthoritySelect.vue'

	const emit = defineEmits(['success'])
	const visible = defineModel<boolean>({ default: false })
	const { data } = defineProps<{ data: Admin }>()
	const submitting = ref(false)

	/** 密码校验: 留空表示不修改, 填写时长度必须 >= 5 并且 <= 20 */
	const passwordRule = (value: string) => !value || (value.length >= 5 && value.length <= 20) || '管理员密码长度必须 >= 5 并且 <= 20'

	const userInfo = useUserInfo()
	const authorityOptions = ref<Authority[]>([])

	const isSuperOptions = ref([
		{ label: '是', value: true },
		{ label: '否', value: false }
	])

	const formData = ref<UpdateAdminParams>({
		id: -1,
		name: '',
		password: '',
		authority: [],
		isSuper: false,
		remark: ''
	})

	/** 打开弹层时回填当前管理员信息并加载权限选项 */
	async function initFormData() {
		formData.value = {
			id: data.id,
			name: data.name,
			password: '',
			authority: [...data.authority],
			isSuper: data.isSuper,
			remark: data.remark
		}
		const { code, msg, data: options = [] } = await account.authoritySelect()
		if (code !== 0) {
			message.error(msg)
		}
		authorityOptions.value = options
	}

	/**
	 * 提交表单。
	 * @param valid 表单校验是否通过。
	 */
	async function submit(valid: boolean) {
		if (submitting.value) return
		if (!valid) {
			message.warning('请保证所有必填项都填写')
			return
		}

		submitting.value = true
		try {
			const body: UpdateAdminParams = { ...formData.value }
			if (body.password?.trim() === '') {
				delete body.password
			}
			const { code, msg } = await admin.updateAdmin(body)
			if (code !== 0) {
				message.error(msg)
				return
			}

			message.success(msg)
			emit('success')
			visible.value = false
		} finally {
			submitting.value = false
		}
	}
</script>

<style scoped lang="scss"></style>
