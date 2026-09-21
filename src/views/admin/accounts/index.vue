<template>
  <div class="p-5 space-y-5">
    <!-- Header -->
    <div class="art-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Manajemen Akun Pengguna
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Kelola akun Administrator dan Guru untuk akses offline aplikasi Guru Offline.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <ElButton type="primary" @click="openCreateModal">
          <i class="ri-user-add-line mr-1"></i> Tambah Akun
        </ElButton>
      </div>
    </div>

    <!-- Accounts Table Card -->
    <div class="art-card p-6">
      <div class="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-2 max-w-sm w-full">
          <ElInput
            v-model="searchQuery"
            placeholder="Cari username atau nama guru..."
            clearable
            prefix-icon="ri-search-line"
          />
        </div>
        <div class="text-xs text-gray-500">
          Total:
          <span class="font-semibold text-gray-700 dark:text-gray-300">{{
            filteredUsers.length
          }}</span>
          akun
        </div>
      </div>

      <ElTable :data="filteredUsers" v-loading="loading" stripe style="width: 100%">
        <ElTableColumn prop="username" label="Username" min-width="140">
          <template #default="{ row }">
            <span class="font-medium text-gray-900 dark:text-gray-100">{{ row.username }}</span>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="role" label="Wewenang (Role)" width="130">
          <template #default="{ row }">
            <ElTag v-if="row.role === 'ADMIN'" type="danger" size="small">ADMIN</ElTag>
            <ElTag v-else-if="row.role === 'GURU'" type="success" size="small">GURU</ElTag>
            <ElTag v-else type="info" size="small">{{ row.role }}</ElTag>
          </template>
        </ElTableColumn>

        <ElTableColumn label="Tautan Data Guru" min-width="200">
          <template #default="{ row }">
            <span v-if="row.role === 'GURU'" class="text-gray-700 dark:text-gray-300">
              {{ getTeacherName(row.teacherId) }}
            </span>
            <span v-else class="text-gray-400 italic">Sistem (Admin)</span>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="status" label="Status" width="110">
          <template #default="{ row }">
            <ElTag :type="row.status === 'ACTIVE' ? 'success' : 'danger'" size="small">
              {{ row.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif' }}
            </ElTag>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="lastLoginAt" label="Login Terakhir" min-width="160">
          <template #default="{ row }">
            <span class="text-xs text-gray-500">{{ formatDate(row.lastLoginAt) }}</span>
          </template>
        </ElTableColumn>

        <ElTableColumn label="Aksi" width="220" fixed="right">
          <template #default="scope">
            <div class="flex items-center gap-2">
              <ElButton
                size="small"
                :type="scope.row.status === 'ACTIVE' ? 'warning' : 'success'"
                link
                @click="toggleStatus(scope.row as UserEntity)"
              >
                {{ scope.row.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan' }}
              </ElButton>

              <ElButton
                size="small"
                type="primary"
                link
                @click="openResetModal(scope.row as UserEntity)"
              >
                Reset Password
              </ElButton>
            </div>
          </template>
        </ElTableColumn>
      </ElTable>
    </div>

    <!-- Create User Dialog -->
    <ElDialog
      v-model="createModalVisible"
      title="Tambah Akun Pengguna Baru"
      width="500px"
      destroy-on-close
    >
      <ElForm ref="createFormRef" :model="createForm" :rules="createRules" label-position="top">
        <ElFormItem label="Username" prop="username">
          <ElInput v-model.trim="createForm.username" placeholder="Masukkan username unik" />
        </ElFormItem>

        <ElFormItem label="Role / Wewenang" prop="role">
          <ElSelect v-model="createForm.role" class="w-full">
            <ElOption label="ADMINISTRATOR" value="ADMIN" />
            <ElOption label="GURU" value="GURU" />
          </ElSelect>
        </ElFormItem>

        <ElFormItem v-if="createForm.role === 'GURU'" label="Tautkan Guru" prop="teacherId">
          <ElSelect
            v-model="createForm.teacherId"
            placeholder="Pilih guru terdaftar"
            filterable
            class="w-full"
          >
            <ElOption v-for="tch in teachersList" :key="tch.id" :label="tch.name" :value="tch.id" />
          </ElSelect>
        </ElFormItem>

        <ElFormItem label="Password Awal" prop="password">
          <ElInput
            v-model.trim="createForm.password"
            type="password"
            placeholder="Minimal 6 karakter"
            show-password
          />
        </ElFormItem>

        <ElFormItem label="Status Akun" prop="status">
          <ElRadioGroup v-model="createForm.status">
            <ElRadio value="ACTIVE">Aktif</ElRadio>
            <ElRadio value="INACTIVE">Nonaktif</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
      </ElForm>

      <template #footer>
        <span class="dialog-footer">
          <ElButton @click="createModalVisible = false">Batal</ElButton>
          <ElButton type="primary" :loading="saving" @click="handleCreateUser">
            Simpan Akun
          </ElButton>
        </span>
      </template>
    </ElDialog>

    <!-- Reset Password Dialog -->
    <ElDialog
      v-model="resetModalVisible"
      :title="`Reset Password: ${selectedUser?.username}`"
      width="450px"
      destroy-on-close
    >
      <div class="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Masukkan password baru untuk pengguna <strong>{{ selectedUser?.username }}</strong
        >.
      </div>
      <ElForm ref="resetFormRef" :model="resetForm" :rules="resetRules" label-position="top">
        <ElFormItem label="Password Baru" prop="newPassword">
          <ElInput
            v-model.trim="resetForm.newPassword"
            type="password"
            placeholder="Minimal 6 karakter"
            show-password
          />
        </ElFormItem>
      </ElForm>

      <template #footer>
        <span class="dialog-footer">
          <ElButton @click="resetModalVisible = false">Batal</ElButton>
          <ElButton type="primary" :loading="saving" @click="handleResetPassword">
            Terapkan Password
          </ElButton>
        </span>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, reactive } from 'vue'
  import {
    ElButton,
    ElInput,
    ElTable,
    ElTableColumn,
    ElTag,
    ElDialog,
    ElForm,
    ElFormItem,
    ElSelect,
    ElOption,
    ElRadioGroup,
    ElRadio,
    ElMessage,
    ElMessageBox,
    type FormInstance,
    type FormRules
  } from 'element-plus'
  import { authService } from '@/core/services/auth'
  import { repositories } from '@/core/repositories'
  import type { UserEntity, TeacherEntity, UserRole, AccountStatus } from '@/core/types'

  defineOptions({ name: 'AdminAccounts' })

  const loading = ref(false)
  const saving = ref(false)
  const users = ref<UserEntity[]>([])
  const teachersList = ref<TeacherEntity[]>([])
  const teacherMap = ref<Map<string, string>>(new Map())
  const searchQuery = ref('')

  const createModalVisible = ref(false)
  const resetModalVisible = ref(false)
  const selectedUser = ref<UserEntity | null>(null)

  const createFormRef = ref<FormInstance>()
  const resetFormRef = ref<FormInstance>()

  const createForm = reactive({
    username: '',
    password: '',
    role: 'GURU' as UserRole,
    teacherId: '',
    status: 'ACTIVE' as AccountStatus
  })

  const resetForm = reactive({
    newPassword: ''
  })

  const createRules: FormRules = {
    username: [
      { required: true, message: 'Username wajib diisi', trigger: 'blur' },
      { min: 3, message: 'Username minimal 3 karakter', trigger: 'blur' }
    ],
    password: [
      { required: true, message: 'Password wajib diisi', trigger: 'blur' },
      { min: 6, message: 'Password minimal 6 karakter', trigger: 'blur' }
    ],
    role: [{ required: true, message: 'Pilih role', trigger: 'change' }],
    teacherId: [{ required: true, message: 'Pilih guru untuk role GURU', trigger: 'change' }]
  }

  const resetRules: FormRules = {
    newPassword: [
      { required: true, message: 'Password baru wajib diisi', trigger: 'blur' },
      { min: 6, message: 'Password minimal 6 karakter', trigger: 'blur' }
    ]
  }

  const loadData = async () => {
    loading.value = true
    try {
      const [allUsers, allTeachers] = await Promise.all([
        repositories.users.findAll(),
        repositories.teachers.findAll()
      ])
      users.value = allUsers
      teachersList.value = allTeachers
      const map = new Map<string, string>()
      allTeachers.forEach((t) => map.set(t.id, t.name))
      teacherMap.value = map
    } catch {
      ElMessage.error('Gagal memuat daftar akun.')
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    loadData()
  })

  const filteredUsers = computed(() => {
    if (!searchQuery.value.trim()) return users.value
    const q = searchQuery.value.toLowerCase()
    return users.value.filter((u) => {
      const teacherName = u.teacherId ? teacherMap.value.get(u.teacherId) || '' : ''
      return u.username.toLowerCase().includes(q) || teacherName.toLowerCase().includes(q)
    })
  })

  const getTeacherName = (teacherId?: string) => {
    if (!teacherId) return '-'
    return teacherMap.value.get(teacherId) || teacherId
  }

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return 'Belum pernah'
    try {
      return new Date(isoStr).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    } catch {
      return isoStr
    }
  }

  const openCreateModal = () => {
    createForm.username = ''
    createForm.password = ''
    createForm.role = 'GURU'
    createForm.teacherId = ''
    createForm.status = 'ACTIVE'
    createModalVisible.value = true
  }

  const handleCreateUser = async () => {
    if (!createFormRef.value) return
    const valid = await createFormRef.value.validate().catch(() => false)
    if (!valid) return

    saving.value = true
    try {
      const res = await authService.createUser({
        username: createForm.username,
        password: createForm.password,
        role: createForm.role,
        teacherId: createForm.role === 'GURU' ? createForm.teacherId : undefined,
        status: createForm.status
      })

      if (res.success) {
        ElMessage.success(res.message)
        createModalVisible.value = false
        await loadData()
      } else {
        ElMessage.error(res.message)
      }
    } catch (err: any) {
      ElMessage.error(err?.message || 'Gagal membuat akun.')
    } finally {
      saving.value = false
    }
  }

  const toggleStatus = async (user: UserEntity) => {
    const newStatus: AccountStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    const actionText = newStatus === 'ACTIVE' ? 'mengaktifkan' : 'menonaktifkan'

    try {
      await ElMessageBox.confirm(
        `Apakah Anda yakin ingin ${actionText} akun '${user.username}'?`,
        'Konfirmasi Status Akun',
        {
          confirmButtonText: 'Ya, Lanjutkan',
          cancelButtonText: 'Batal',
          type: newStatus === 'ACTIVE' ? 'info' : 'warning'
        }
      )

      const res = await authService.setUserStatus(user.id, newStatus)
      if (res.success) {
        ElMessage.success(res.message)
        await loadData()
      } else {
        ElMessage.error(res.message)
      }
    } catch (err: any) {
      if (err !== 'cancel') {
        ElMessage.error(err?.message || 'Gagal mengubah status akun.')
      }
    }
  }

  const openResetModal = (user: UserEntity) => {
    selectedUser.value = user
    resetForm.newPassword = ''
    resetModalVisible.value = true
  }

  const handleResetPassword = async () => {
    if (!resetFormRef.value || !selectedUser.value) return
    const valid = await resetFormRef.value.validate().catch(() => false)
    if (!valid) return

    saving.value = true
    try {
      const res = await authService.adminResetPassword(selectedUser.value.id, resetForm.newPassword)
      if (res.success) {
        ElMessage.success(res.message)
        resetModalVisible.value = false
      } else {
        ElMessage.error(res.message)
      }
    } catch (err: any) {
      ElMessage.error(err?.message || 'Gagal mereset password.')
    } finally {
      saving.value = false
    }
  }
</script>
