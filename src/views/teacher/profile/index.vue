<template>
  <div class="p-5 space-y-5 max-w-4xl mx-auto">
    <!-- Header -->
    <div class="art-card p-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Profil & Keamanan Akun Guru
      </h1>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
        Kelola identitas akun dan perbarui kata sandi untuk akses offline Anda.
      </p>
    </div>

    <!-- Identity Overview Card -->
    <div class="art-card p-6">
      <h2 class="text-base font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <i class="ri-user-3-line text-emerald-600"></i> Identitas & Data Pengajar
      </h2>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div
          class="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800"
        >
          <div class="text-xs text-gray-500 dark:text-gray-400">Nama Lengkap Guru</div>
          <div class="text-base font-semibold text-gray-900 dark:text-gray-100 mt-1">
            {{ teacher?.name || currentSession?.teacherName || '-' }}
          </div>
        </div>

        <div
          class="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800"
        >
          <div class="text-xs text-gray-500 dark:text-gray-400">NIP / NUPTK</div>
          <div class="text-base font-semibold text-gray-900 dark:text-gray-100 mt-1">
            {{ teacher?.nip || teacher?.nuptk || '-' }}
          </div>
        </div>

        <div
          class="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800"
        >
          <div class="text-xs text-gray-500 dark:text-gray-400">Wewenang / Hak Akses</div>
          <div class="text-base font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
            GURU (OPERASIONAL)
          </div>
        </div>

        <div
          class="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800"
        >
          <div class="text-xs text-gray-500 dark:text-gray-400">Status Akun</div>
          <div class="text-base font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
            AKTIF
          </div>
        </div>
      </div>

      <div class="border-t border-gray-100 dark:border-gray-800 pt-5">
        <h3
          class="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-1.5"
        >
          <i class="ri-edit-line text-primary"></i> Data Kontak Guru (Dapat Diperbarui)
        </h3>

        <ElForm
          ref="contactFormRef"
          :model="contactForm"
          label-position="top"
          class="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <ElFormItem label="Nomor Telepon / WhatsApp" prop="phone">
            <ElInput
              v-model.trim="contactForm.phone"
              placeholder="Contoh: 08123456789"
              prefix-icon="ri-phone-line"
            />
          </ElFormItem>

          <ElFormItem label="Email Pribadi / Sekolah" prop="email">
            <ElInput
              v-model.trim="contactForm.email"
              placeholder="Contoh: nama@smknuungaran.sch.id"
              prefix-icon="ri-mail-line"
            />
          </ElFormItem>

          <ElFormItem label="Alamat Domisili" prop="address" class="sm:col-span-2">
            <ElInput
              v-model.trim="contactForm.address"
              type="textarea"
              :rows="2"
              placeholder="Alamat tempat tinggal"
            />
          </ElFormItem>

          <div class="sm:col-span-2">
            <ElButton type="primary" :loading="savingContact" @click="handleSaveContact">
              <i class="ri-save-line mr-1"></i> Simpan Data Kontak
            </ElButton>
          </div>
        </ElForm>
      </div>
    </div>

    <!-- Password Change Card -->
    <div class="art-card p-6">
      <h2 class="text-base font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
        <i class="ri-lock-password-line text-blue-600"></i> Ganti Kata Sandi
      </h2>
      <p class="text-xs text-gray-500 mb-5">
        Perbarui kata sandi secara offline menggunakan enkripsi standar PBKDF2-SHA256 lokal.
      </p>

      <ElForm
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
        label-position="top"
        class="max-w-md"
      >
        <ElFormItem label="Password Saat Ini" prop="currentPassword">
          <ElInput
            v-model.trim="passwordForm.currentPassword"
            type="password"
            placeholder="Masukkan password Anda saat ini"
            show-password
          />
        </ElFormItem>

        <ElFormItem label="Password Baru" prop="newPassword">
          <ElInput
            v-model.trim="passwordForm.newPassword"
            type="password"
            placeholder="Minimal 6 karakter"
            show-password
          />
        </ElFormItem>

        <ElFormItem label="Konfirmasi Password Baru" prop="confirmPassword">
          <ElInput
            v-model.trim="passwordForm.confirmPassword"
            type="password"
            placeholder="Ulangi password baru"
            show-password
          />
        </ElFormItem>

        <div class="pt-2">
          <ElButton type="primary" :loading="saving" @click="handleChangePassword">
            Simpan Password Baru
          </ElButton>
        </div>
      </ElForm>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, onMounted } from 'vue'
  import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
  import { authService } from '@/core/services/auth'
  import { repositories } from '@/core/repositories'
  import type { SessionData, TeacherEntity } from '@/core/types'

  defineOptions({ name: 'TeacherProfile' })

  const currentSession = ref<SessionData | null>(null)
  const teacher = ref<TeacherEntity | null>(null)
  const saving = ref(false)
  const savingContact = ref(false)
  const passwordFormRef = ref<FormInstance>()
  const contactFormRef = ref<FormInstance>()

  const contactForm = reactive({
    phone: '',
    email: '',
    address: ''
  })

  const passwordForm = reactive({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const passwordRules: FormRules = {
    currentPassword: [
      { required: true, message: 'Password saat ini wajib diisi', trigger: 'blur' }
    ],
    newPassword: [
      { required: true, message: 'Password baru wajib diisi', trigger: 'blur' },
      { min: 6, message: 'Password baru minimal 6 karakter', trigger: 'blur' }
    ],
    confirmPassword: [
      { required: true, message: 'Konfirmasi password baru wajib diisi', trigger: 'blur' },
      {
        validator: (_rule, value, callback) => {
          if (value !== passwordForm.newPassword) {
            callback(new Error('Konfirmasi password tidak cocok dengan password baru'))
          } else {
            callback()
          }
        },
        trigger: 'blur'
      }
    ]
  }

  onMounted(async () => {
    currentSession.value = authService.getCurrentSession()
    if (currentSession.value?.teacherId) {
      try {
        const t = await repositories.teachers.findById(currentSession.value.teacherId)
        teacher.value = t || null
        if (t) {
          contactForm.phone = t.phone || ''
          contactForm.email = t.email || ''
          contactForm.address = t.address || ''
        }
      } catch (err) {
        console.warn('[TeacherProfile] Error loading teacher details:', err)
      }
    }
  })

  const handleSaveContact = async () => {
    if (!teacher.value?.id) return
    savingContact.value = true
    try {
      await repositories.teachers.update(teacher.value.id, {
        phone: contactForm.phone,
        email: contactForm.email,
        address: contactForm.address,
        updatedAt: new Date().toISOString()
      })
      ElMessage.success('Data kontak guru berhasil diperbarui.')
    } catch (err: any) {
      ElMessage.error(err?.message || 'Gagal menyimpan data kontak.')
    } finally {
      savingContact.value = false
    }
  }

  const handleChangePassword = async () => {
    if (!passwordFormRef.value || !currentSession.value) return
    const valid = await passwordFormRef.value.validate().catch(() => false)
    if (!valid) return

    saving.value = true
    try {
      const res = await authService.changePassword(
        currentSession.value.userId,
        passwordForm.currentPassword,
        passwordForm.newPassword
      )

      if (res.success) {
        ElMessage.success(res.message)
        passwordForm.currentPassword = ''
        passwordForm.newPassword = ''
        passwordForm.confirmPassword = ''
        passwordFormRef.value.resetFields()
      } else {
        ElMessage.error(res.message)
      }
    } catch (err: any) {
      ElMessage.error(err?.message || 'Gagal mengubah password.')
    } finally {
      saving.value = false
    }
  }
</script>
