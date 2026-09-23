<!-- 登录页面 - Guru Offline SMK NU Ungaran -->
<template>
  <div class="flex w-full h-screen">
    <LoginLeftView />

    <div class="relative flex-1">
      <AuthTopBar />

      <div class="auth-right-wrap">
        <div class="form">
          <div class="mb-4 flex items-center gap-2">
            <span
              class="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
            >
              OFFLINE-FIRST
            </span>
            <span
              v-if="isOnline"
              class="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 flex items-center gap-1"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              Terhubung Cloud
            </span>
            <span
              v-else
              class="px-2 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Mode Offline
            </span>
          </div>
          <h3 class="title">SMK NU UNGARAN</h3>
          <p class="sub-title">Masuk ke Portal Akademik & Pengajaran Guru Offline</p>

          <!-- Error Alert Banner if any -->
          <ElAlert
            v-if="errorMessage"
            :title="errorMessage"
            type="error"
            show-icon
            :closable="true"
            @close="errorMessage = ''"
            class="!mt-4 !mb-2"
          />

          <ElForm
            ref="formRef"
            :model="formData"
            :rules="rules"
            :key="formKey"
            @keyup.enter="handleSubmit"
            style="margin-top: 20px"
          >
            <!-- Preset Role Selector for Fast Access/Testing -->
            <ElFormItem label="Pilihan Akun Cepat" prop="account">
              <ElSelect v-model="formData.account" @change="setupAccount" class="w-full">
                <ElOption
                  v-for="account in accounts"
                  :key="account.key"
                  :label="account.label"
                  :value="account.key"
                >
                  <div class="flex items-center justify-between">
                    <span>{{ account.label }}</span>
                    <span class="text-xs text-gray-400">{{ account.userName }}</span>
                  </div>
                </ElOption>
              </ElSelect>
            </ElFormItem>

            <ElFormItem label="Username" prop="username">
              <ElInput
                class="custom-height"
                placeholder="Masukkan username (contoh: admin atau guru)"
                v-model.trim="formData.username"
                prefix-icon="ri-user-line"
              />
            </ElFormItem>

            <ElFormItem label="Password" prop="password">
              <ElInput
                class="custom-height"
                placeholder="Masukkan kata sandi"
                v-model.trim="formData.password"
                type="password"
                autocomplete="off"
                show-password
                prefix-icon="ri-lock-line"
              />
            </ElFormItem>

            <div style="margin-top: 30px">
              <ElButton
                class="w-full custom-height !text-base font-semibold"
                type="primary"
                @click="handleSubmit"
                :loading="loading"
                v-ripple
              >
                Masuk ke Aplikasi
              </ElButton>
            </div>

            <div class="mt-6 text-center text-xs text-gray-500">
              Mode Offline Lokal Terproteksi — Database IndexedDB
            </div>
          </ElForm>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, computed, onMounted } from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  import { useUserStore } from '@/store/modules/user'
  import { authService } from '@/core/services/auth'
  import { connectivityManager } from '@/core/services/sync/ConnectivityManager'
  import type { AuthState } from '@/core/types'
  import {
    ElNotification,
    ElMessage,
    ElAlert,
    ElForm,
    ElFormItem,
    ElSelect,
    ElOption,
    ElInput,
    ElButton,
    type FormInstance,
    type FormRules
  } from 'element-plus'
  import LoginLeftView from '@/components/core/views/login/LoginLeftView.vue'
  import AuthTopBar from '@/components/core/views/login/AuthTopBar.vue'

  defineOptions({ name: 'Login' })

  const userStore = useUserStore()
  const router = useRouter()
  const route = useRoute()
  const formKey = ref(0)
  const loading = ref(false)
  const loginState = ref<AuthState>('idle')
  const errorMessage = ref('')
  const isOnline = connectivityManager.isOnline

  type AccountKey = 'admin' | 'guru' | 'custom'

  interface AccountPreset {
    key: AccountKey
    label: string
    userName: string
    password: string
    role: string
  }

  const accounts = computed<AccountPreset[]>(() => [
    {
      key: 'admin',
      label: 'Administrator (admin)',
      userName: 'admin',
      password: 'admin123',
      role: 'ADMIN'
    },
    {
      key: 'guru',
      label: 'Guru Pengajar (guru)',
      userName: 'guru',
      password: 'guru123',
      role: 'GURU'
    },
    {
      key: 'custom',
      label: 'Akun Kustom Lainnya...',
      userName: '',
      password: '',
      role: ''
    }
  ])

  const formRef = ref<FormInstance>()

  const formData = reactive({
    account: 'admin' as AccountKey,
    username: 'admin',
    password: 'admin123'
  })

  const rules = computed<FormRules>(() => ({
    username: [{ required: true, message: 'Username wajib diisi', trigger: 'blur' }],
    password: [{ required: true, message: 'Password wajib diisi', trigger: 'blur' }]
  }))

  onMounted(() => {
    setupAccount('admin')
  })

  // Set up preset account
  const setupAccount = (key: AccountKey) => {
    const selected = accounts.value.find((acc) => acc.key === key)
    if (selected && key !== 'custom') {
      formData.account = key
      formData.username = selected.userName
      formData.password = selected.password
    } else {
      formData.account = 'custom'
    }
  }

  // Handle local offline submission
  const handleSubmit = async () => {
    if (!formRef.value) return
    errorMessage.value = ''

    try {
      const valid = await formRef.value.validate()
      if (!valid) return

      loading.value = true
      loginState.value = 'loading'

      // 1. Centralized Login via AuthService (Supabase + Offline IndexedDB)
      const res = await authService.login(formData.username, formData.password)

      if (!res.success || !res.session) {
        loginState.value = 'error'
        errorMessage.value = res.message || 'Login gagal.'
        ElMessage.error(res.message || 'Login gagal.')
        return
      }

      loginState.value = isOnline.value ? 'authenticated' : 'offline'

      // 2. Set user store session tokens and info with canonical identity
      userStore.setToken(res.session.sessionId, res.session.sessionId)
      userStore.setLoginStatus(true)
      userStore.setUserInfo({
        userId: (res.identity?.userId || res.session.userId) as any,
        userName: res.identity?.displayName || res.session.username,
        email: res.identity?.email || `${res.session.username.toLowerCase()}@smknuungaran.sch.id`,
        roles: [res.session.role],
        buttons:
          res.identity?.permissions ||
          (res.session.role === 'ADMIN' ? ['admin:all'] : ['teacher:all'])
      })

      // 3. Show success notice
      const displayName =
        res.identity?.displayName ||
        (res.session.role === 'GURU'
          ? res.session.teacherName || res.session.username
          : res.session.username)

      ElNotification({
        title: 'Login Berhasil',
        message: `Selamat datang, ${displayName}!`,
        type: 'success',
        duration: 3000
      })

      // Proactively prefetch all routes for zero loading
      import('@/router/core/ComponentLoader').then(({ componentLoader }) => {
        componentLoader.prefetchAll()
      })

      // 4. Role-based redirect
      const queryRedirect = route.query.redirect as string
      if (queryRedirect && !queryRedirect.includes('/auth/login')) {
        router.push(queryRedirect)
      } else {
        if (res.session.role === 'ADMIN') {
          router.push('/admin/dashboard')
        } else if (res.session.role === 'GURU') {
          router.push('/teacher/dashboard')
        } else {
          router.push('/admin/dashboard')
        }
      }
    } catch (error: any) {
      console.error('[Login] Error during local login:', error)
      errorMessage.value = error?.message || 'Terjadi kesalahan sistem saat proses login.'
      ElMessage.error(errorMessage.value)
    } finally {
      loading.value = false
    }
  }
</script>

<style scoped>
  @import './style.css';
</style>

<style lang="scss" scoped>
  :deep(.el-select__wrapper) {
    height: 40px !important;
  }
</style>
