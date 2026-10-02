<!-- 用户菜单 -->
<template>
  <ElPopover
    ref="userMenuPopover"
    placement="bottom-end"
    :width="260"
    :hide-after="0"
    :offset="10"
    trigger="hover"
    :show-arrow="false"
    popper-class="user-menu-popover"
    popper-style="padding: 8px 16px;"
  >
    <template #reference>
      <button
        type="button"
        class="flex items-center gap-2 p-1 rounded-full cursor-pointer border-none bg-transparent hover:ring-2 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all mr-2 max-sm:mr-1"
        aria-label="Menu Akun Pengguna"
        title="Profil & Pengaturan Akun"
      >
        <img
          class="size-8.5 rounded-full object-cover max-sm:w-6.5 max-sm:h-6.5 border border-slate-200 dark:border-slate-700"
          :src="userAvatar"
          alt="Foto Profil Pengguna"
        />
      </button>
    </template>
    <template #default>
      <div class="pt-2">
        <div class="flex items-center pb-2.5 px-0 border-b border-g-300/80">
          <img
            class="w-10 h-10 mr-3 overflow-hidden rounded-full border border-slate-200 dark:border-slate-700 object-cover"
            :src="userAvatar"
            alt="Foto Profil"
          />
          <div class="w-[calc(100%-52px)]">
            <div class="flex items-center justify-between gap-1">
              <span class="block text-sm font-semibold text-g-800 truncate">{{
                userInfo.userName || 'Pengguna'
              }}</span>
              <span
                class="inline-block px-1.5 py-0.2 text-[10px] font-medium rounded uppercase bg-primary/10 text-primary shrink-0"
              >
                {{ isTeacher ? 'Guru' : 'Admin' }}
              </span>
            </div>
            <span class="block mt-0.5 text-xs text-g-500 truncate">
              {{ userInfo.email || 'offline@smknuungaran.sch.id' }}
            </span>
          </div>
        </div>

        <ul class="py-2.5 my-1 space-y-1">
          <template v-if="isTeacher">
            <li
              class="btn-item"
              @click="goPage('/teacher/profile')"
              tabindex="0"
              @keydown.enter="goPage('/teacher/profile')"
            >
              <ArtSvgIcon icon="ri:user-smile-line" aria-hidden="true" />
              <span>Profil Guru</span>
            </li>
            <li
              class="btn-item"
              @click="goPage('/teacher/schedule')"
              tabindex="0"
              @keydown.enter="goPage('/teacher/schedule')"
            >
              <ArtSvgIcon icon="ri:calendar-event-line" aria-hidden="true" />
              <span>Jadwal Mengajar</span>
            </li>
            <li
              class="btn-item"
              @click="goPage('/teacher/sync-status')"
              tabindex="0"
              @keydown.enter="goPage('/teacher/sync-status')"
            >
              <ArtSvgIcon icon="ri:refresh-line" aria-hidden="true" />
              <span>Status Sinkronisasi</span>
            </li>
          </template>

          <template v-else>
            <li
              class="btn-item"
              @click="goPage('/admin/sync-monitor')"
              tabindex="0"
              @keydown.enter="goPage('/admin/sync-monitor')"
            >
              <ArtSvgIcon icon="ri:cloud-line" aria-hidden="true" />
              <span>Sync Monitor</span>
            </li>
            <li
              class="btn-item"
              @click="goPage('/admin/accounts')"
              tabindex="0"
              @keydown.enter="goPage('/admin/accounts')"
            >
              <ArtSvgIcon icon="ri:user-settings-line" aria-hidden="true" />
              <span>Akun Pengguna</span>
            </li>
            <li
              class="btn-item"
              @click="goPage('/admin/settings')"
              tabindex="0"
              @keydown.enter="goPage('/admin/settings')"
            >
              <ArtSvgIcon icon="ri:settings-4-line" aria-hidden="true" />
              <span>Pengaturan Sekolah</span>
            </li>
          </template>

          <div class="w-full h-px my-2 bg-g-300/80" aria-hidden="true"></div>

          <li
            class="btn-item !text-danger hover:!bg-danger/10 font-medium"
            @click="loginOut"
            tabindex="0"
            @keydown.enter="loginOut"
            role="button"
            aria-label="Keluar dari Akun"
          >
            <ArtSvgIcon icon="ri:logout-box-r-line" aria-hidden="true" />
            <span>Keluar Sistem</span>
          </li>
        </ul>
      </div>
    </template>
  </ElPopover>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useRouter } from 'vue-router'
  import { ElMessageBox } from 'element-plus'
  import { useUserStore } from '@/store/modules/user'
  import { authorizationService, authService } from '@/core/services/auth'
  import { repositories } from '@/core/repositories'
  import defaultAvatar from '@/assets/images/user/avatar.webp'

  defineOptions({ name: 'ArtUserMenu' })

  const router = useRouter()
  const userStore = useUserStore()

  const { getUserInfo: userInfo } = storeToRefs(userStore)
  const userMenuPopover = ref()

  const userAvatar = computed(() => {
    return userInfo.value.avatar || defaultAvatar
  })

  onMounted(async () => {
    if (!userInfo.value.avatar) {
      const session = authService.getCurrentSession()
      if (session?.teacherId) {
        try {
          const t = await repositories.teachers.findById(session.teacherId)
          if (t?.photo) {
            userStore.info.avatar = t.photo
          }
        } catch {
          // ignore
        }
      }
    }
  })

  const isTeacher = computed(() => {
    if (authorizationService.isTeacher()) return true
    if (authorizationService.isAdmin()) return false
    const roles = userInfo.value.roles || []
    return roles.includes('GURU') || roles.includes('R_TEACHER')
  })

  /**
   * 页面跳转
   * @param {string} path - 目标路径
   */
  const goPage = (path: string): void => {
    closeUserMenu()
    router.push(path)
  }

  /**
   * 用户登出确认
   */
  const loginOut = (): void => {
    closeUserMenu()
    setTimeout(() => {
      ElMessageBox.confirm(
        'Apakah Anda yakin ingin keluar dari sistem Guru Offline SMK NU Ungaran?',
        'Konfirmasi Keluar',
        {
          confirmButtonText: 'Ya, Keluar',
          cancelButtonText: 'Batal',
          type: 'warning',
          customClass: 'login-out-dialog'
        }
      )
        .then(async () => {
          await userStore.logOut()
        })
        .catch(() => {
          // user cancelled
        })
    }, 150)
  }

  /**
   * 关闭用户菜单弹出层
   */
  const closeUserMenu = (): void => {
    userMenuPopover.value?.hide?.()
  }
</script>

<style scoped>
  @reference '@styles/core/tailwind.css';

  @layer components {
    .btn-item {
      @apply flex items-center px-2.5 py-2 select-none rounded-md cursor-pointer transition-colors duration-150 text-g-700 dark:text-g-300 hover:bg-g-200 dark:hover:bg-g-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary;

      span {
        @apply text-xs font-medium;
      }

      .art-svg-icon {
        @apply mr-2.5 text-base shrink-0;
      }
    }
  }
</style>
