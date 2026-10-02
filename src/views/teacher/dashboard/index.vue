<template>
  <div class="p-4 md:p-6 space-y-6">
    <!-- Active Schedule Alert Banner (If Any) -->
    <div
      v-if="activeAlert"
      class="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-fade-in"
    >
      <div class="flex items-center gap-3">
        <div
          class="size-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0"
        >
          <i
            :class="
              activeAlert.type === 'SESSION_STARTED'
                ? 'ri-alarm-warning-line text-xl'
                : 'ri-time-line text-xl'
            "
          ></i>
        </div>
        <div>
          <div
            class="font-bold text-sm text-emerald-950 dark:text-emerald-100 flex items-center gap-2"
          >
            <span>{{ activeAlert.title }}</span>
            <span
              v-if="activeAlert.minutesRemaining !== undefined"
              class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200"
            >
              {{ activeAlert.minutesRemaining }} menit lagi
            </span>
          </div>
          <p class="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
            {{ activeAlert.message }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <ElButton
          type="primary"
          size="small"
          class="bg-emerald-600 hover:bg-emerald-700 border-none"
          @click="goToAttendance(activeAlert.scheduleId)"
        >
          <i class="ri-user-follow-line mr-1"></i> Presensi Sesi Ini
        </ElButton>
        <ElButton size="small" text @click="dismissAlert"> Tutup </ElButton>
      </div>
    </div>

    <!-- Teacher Command Header Card -->
    <div
      class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6"
    >
      <div class="space-y-1.5">
        <div class="flex items-center gap-2 flex-wrap">
          <span
            class="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60"
          >
            <span class="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            OFFLINE READY
          </span>
          <span
            class="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
          >
            PORTAL GURU
          </span>
          <span
            class="px-2.5 py-0.5 text-xs font-medium rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60"
          >
            SMK NU UNGARAN
          </span>
        </div>
        <h1 class="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Selamat Datang, {{ teacherName || currentSession?.username }}
        </h1>
        <p class="text-xs md:text-sm text-slate-500 dark:text-slate-400">
          {{ formattedTodayDate }} &bull; TP {{ academicYearName || '2026/2027' }} (Semester
          {{ semesterName || 'Ganjil' }})
        </p>
      </div>

      <!-- Quick Action Buttons Header -->
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-xs transition-all cursor-pointer"
          @click="handleQuickAttendance"
        >
          <i class="ri-user-follow-line text-sm"></i> Presensi
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-all cursor-pointer"
          @click="handleQuickJournal"
        >
          <i class="ri-book-read-line text-sm"></i> Jurnal
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-all cursor-pointer"
          @click="goToAssessment"
        >
          <i class="ri-file-list-3-line text-sm"></i> Penilaian
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-all cursor-pointer"
          @click="goToDiscipline"
        >
          <i class="ri-shield-star-line text-sm"></i> Disiplin
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-all cursor-pointer"
          @click="goToSchedule"
        >
          <i class="ri-calendar-schedule-line text-sm"></i> Jadwal
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg transition-all cursor-pointer"
          title="Pengaturan Notifikasi Jadwal"
          @click="openNotificationSettingsModal"
        >
          <i class="ri-notification-3-line text-sm"></i>
        </button>
      </div>
    </div>

    <!-- Sync & Connectivity Status Bar -->
    <div
      v-if="pendingSyncCount > 0 || !isOnline"
      class="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-900 dark:text-amber-200"
    >
      <div class="flex items-center gap-3">
        <div
          class="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg text-amber-700 dark:text-amber-300"
        >
          <i :class="isOnline ? 'ri-cloud-line text-xl' : 'ri-cloud-off-line text-xl'"></i>
        </div>
        <div>
          <div class="font-semibold text-sm flex items-center gap-2">
            <span>
              {{
                pendingSyncCount > 0
                  ? `Terdapat ${pendingSyncCount} data tersimpan lokal`
                  : 'Mode Offline Aktif'
              }}
            </span>
            <span
              class="px-2 py-0.5 text-[10px] font-bold rounded-full"
              :class="
                isOnline
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              "
            >
              {{ isOnline ? 'ONLINE' : 'OFFLINE' }}
            </span>
          </div>
          <div class="text-xs text-amber-700 dark:text-amber-400">
            {{
              isOnline
                ? 'Data tersimpan di IndexedDB lokal dan siap disinkronkan ke Supabase/Cloud.'
                : 'Tersimpan lokal di perangkat — otomatis tersinkron saat internet tersedia.'
            }}
          </div>
        </div>
      </div>
      <ElButton v-if="isOnline" type="warning" :loading="syncing" @click="handleSyncNow">
        <i class="ri-sync-line mr-1"></i> Sinkronkan Sekarang
      </ElButton>
    </div>

    <!-- Top Focus Grid: Next Class Hero & Daily Progress -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Next Class Hero Card (Section 4) / Live Class Monitoring Widget -->
      <div
        class="lg:col-span-2 bg-slate-900 text-white rounded-2xl p-5 md:p-6 shadow-md border border-slate-700/80 flex flex-col justify-between relative overflow-hidden"
      >
        <div class="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
          <i class="ri-dashboard-3-line text-[180px]"></i>
        </div>

        <div>
          <!-- Widget Top Header -->
          <div class="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800">
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="px-2.5 py-1 text-xs font-bold rounded-md uppercase tracking-wider font-mono flex items-center gap-1.5"
                :class="
                  nextClassData?.timingStatus === 'ONGOING'
                    ? 'bg-emerald-500 text-white shadow-xs animate-pulse'
                    : nextClassData?.timingStatus === 'STARTING_SOON'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-800 text-slate-200 border border-slate-700'
                "
              >
                <span
                  class="size-2 rounded-full bg-white animate-ping"
                  v-if="nextClassData?.timingStatus === 'ONGOING'"
                ></span>
                {{
                  nextClassData?.timingStatus === 'ONGOING'
                    ? '🔴 KELAS SAAT INI (SEDANG BERLANGSUNG)'
                    : nextClassData?.timingStatus === 'STARTING_SOON'
                      ? '⏳ SEGERA DIMULAI'
                      : nextClassData
                        ? '🔵 KELAS BERIKUTNYA'
                        : 'STATUS MENGAJAR HARI INI'
                }}
              </span>

              <!-- Live Timer Badge -->
              <span
                v-if="liveClassCountdown"
                class="text-xs font-mono font-bold px-2.5 py-1 rounded-md border flex items-center gap-1.5"
                :class="
                  liveClassCountdown.type === 'ONGOING'
                    ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700/80'
                    : 'bg-amber-950/90 text-amber-300 border-amber-700/80'
                "
              >
                <i class="ri-timer-line text-sm"></i>
                {{
                  liveClassCountdown.type === 'ONGOING'
                    ? `Sisa Waktu: ${liveClassCountdown.formattedTime}`
                    : `Dimulai dalam ${liveClassCountdown.formattedTime}`
                }}
              </span>
            </div>

            <button
              type="button"
              class="text-xs font-medium text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              @click="goToSchedule"
            >
              Jadwal Lengkap <i class="ri-arrow-right-line"></i>
            </button>
          </div>

          <!-- If Class Available -->
          <div v-if="nextClassData" class="space-y-4">
            <div class="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <!-- Class Info Details -->
              <div class="space-y-1.5">
                <div class="flex items-center gap-2">
                  <span
                    class="px-2 py-0.5 text-xs font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  >
                    {{ nextClassData.className }}
                  </span>
                  <span class="text-xs font-medium text-slate-400">{{
                    nextClassData.majorName
                  }}</span>
                </div>
                <h2 class="text-2xl font-bold tracking-tight text-white mt-1">
                  {{ nextClassData.subjectName }}
                </h2>
                <div
                  class="flex flex-wrap items-center gap-2.5 text-xs text-slate-300 pt-1 font-mono"
                >
                  <span
                    class="flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700"
                  >
                    <i class="ri-time-line text-emerald-400"></i> {{ nextClassData.timeStart }} –
                    {{ nextClassData.timeEnd }} WIB
                  </span>
                  <span
                    class="flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700"
                  >
                    <i class="ri-map-pin-2-line text-emerald-400"></i> {{ nextClassData.roomName }}
                  </span>
                  <span
                    class="flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700"
                  >
                    <i class="ri-bookmark-line text-emerald-400"></i> Jam
                    {{ nextClassData.periodStart }}-{{ nextClassData.periodEnd }} ({{
                      nextClassData.totalPeriods
                    }}
                    JP)
                  </span>
                </div>
              </div>

              <!-- Dedicated Live Timer Box -->
              <div
                v-if="liveClassCountdown"
                class="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3.5 min-w-[210px] flex flex-col justify-center items-center text-center shadow-inner"
              >
                <template v-if="liveClassCountdown.type === 'ONGOING'">
                  <div
                    class="text-[10px] uppercase font-bold tracking-wider text-emerald-400 mb-1 flex items-center gap-1"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    Berjalan / Durasi
                  </div>
                  <div class="text-2xl font-mono font-extrabold text-white tracking-tight">
                    {{ liveClassCountdown.formattedElapsed }}
                  </div>
                  <div class="text-[11px] text-slate-400 font-mono mt-0.5">
                    Sisa
                    <span class="text-emerald-300 font-bold">{{
                      liveClassCountdown.formattedTime
                    }}</span>
                    ({{ liveClassCountdown.totalDurationMin }}m Total)
                  </div>
                </template>
                <template v-else>
                  <div class="text-[10px] uppercase font-bold tracking-wider text-amber-400 mb-1">
                    Hitung Mundur Mulai
                  </div>
                  <div class="text-2xl font-mono font-extrabold text-white tracking-tight">
                    {{ liveClassCountdown.formattedTime }}
                  </div>
                  <div class="text-[11px] text-slate-400 font-mono mt-0.5">
                    Mulai Jam {{ nextClassData.timeStart }} WIB
                  </div>
                </template>
              </div>
            </div>

            <!-- Live Class Progress Bar -->
            <div
              v-if="liveClassCountdown && liveClassCountdown.type === 'ONGOING'"
              class="space-y-1.5 pt-1"
            >
              <div class="flex justify-between text-xs text-slate-300 font-mono">
                <span>Progres Jam Pembelajaran</span>
                <span class="font-bold text-emerald-400"
                  >{{ liveClassCountdown.percent }}% Selesai</span
                >
              </div>
              <div
                class="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700"
              >
                <div
                  class="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 h-full transition-all duration-1000 ease-linear rounded-full shadow-xs"
                  :style="{ width: liveClassCountdown.percent + '%' }"
                ></div>
              </div>
            </div>
          </div>

          <!-- If No Class Available -->
          <div v-else class="py-6 space-y-2">
            <div class="text-emerald-400 font-bold text-base flex items-center gap-2">
              <i class="ri-checkbox-circle-line text-xl"></i> Seluruh Sesi Mengajar Hari Ini Telah
              Selesai
            </div>
            <p class="text-xs text-slate-400 max-w-md">
              Tidak ada kelas aktif saat ini. Seluruh jam tatap muka hari ini telah rampung ({{
                todayDayName
              }}).
            </p>
          </div>
        </div>

        <!-- Next Class Quick Action Footer & Following Class Preview -->
        <div v-if="nextClassData" class="pt-4 mt-4 border-t border-slate-800/80 space-y-3">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <span
                class="px-2.5 py-1 text-[11px] font-semibold rounded-md border flex items-center gap-1.5"
                :class="
                  nextClassData.attendanceDone
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                    : 'bg-amber-950/80 text-amber-300 border-amber-800'
                "
              >
                <i
                  :class="
                    nextClassData.attendanceDone
                      ? 'ri-checkbox-circle-line text-emerald-400'
                      : 'ri-time-line text-amber-400'
                  "
                ></i>
                Presensi: {{ nextClassData.attendanceDone ? 'Sudah Diisi' : 'Belum Diisi' }}
              </span>
              <span
                class="px-2.5 py-1 text-[11px] font-semibold rounded-md border flex items-center gap-1.5"
                :class="
                  nextClassData.journalDone
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                    : 'bg-amber-950/80 text-amber-300 border-amber-800'
                "
              >
                <i
                  :class="
                    nextClassData.journalDone
                      ? 'ri-checkbox-circle-line text-emerald-400'
                      : 'ri-time-line text-amber-400'
                  "
                ></i>
                Jurnal: {{ nextClassData.journalDone ? 'Sudah Diisi' : 'Belum Diisi' }}
              </span>
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                class="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-lg transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                @click="goToAttendance(nextClassData.id)"
              >
                <i class="ri-user-follow-line"></i>
                {{ nextClassData.attendanceDone ? 'Edit Presensi' : 'Mulai Presensi' }}
              </button>
              <button
                type="button"
                class="px-3.5 py-2 text-xs font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 active:bg-slate-900 rounded-lg transition-all cursor-pointer border border-slate-700 flex items-center gap-1.5"
                @click="goToJournal(nextClassData.id)"
              >
                <i class="ri-book-read-line"></i>
                {{ nextClassData.journalDone ? 'Edit Jurnal' : 'Buka Jurnal' }}
              </button>
            </div>
          </div>

          <!-- Subsequent Class Shortcut Banner (Jam Selanjutnya) -->
          <div
            v-if="followingClassData"
            class="px-3.5 py-2.5 bg-slate-800/70 rounded-xl border border-slate-700/70 text-xs text-slate-300 flex items-center justify-between gap-3"
          >
            <div class="flex items-center gap-2 truncate">
              <span
                class="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/80 rounded shrink-0"
              >
                JAM SELANJUTNYA
              </span>
              <span class="font-bold text-white truncate">{{
                followingClassData.subjectName
              }}</span>
              <span class="text-slate-400 font-mono"
                >&bull; {{ followingClassData.className }}</span
              >
              <span class="text-slate-400 hidden sm:inline font-mono"
                >&bull; {{ followingClassData.roomName }}</span
              >
            </div>
            <div class="font-mono text-emerald-400 font-bold shrink-0 flex items-center gap-1">
              <i class="ri-calendar-event-line"></i> Pukul {{ followingClassData.timeStart }} WIB
            </div>
          </div>
        </div>
      </div>

      <!-- Daily Progress & Completion Summary Card (Section 26) -->
      <div
        class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-xs flex flex-col justify-between gap-4"
      >
        <div>
          <div class="flex items-center justify-between mb-3">
            <h3
              class="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5"
            >
              <i class="ri-task-line text-emerald-600"></i> Progres Operasional Hari Ini
            </h3>
            <span class="text-xs font-semibold font-mono text-emerald-600 dark:text-emerald-400">
              {{ dailyCompletionPercent }}%
            </span>
          </div>

          <!-- Progress Bar -->
          <div
            class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden mb-4"
          >
            <div
              class="bg-emerald-600 h-2.5 rounded-full transition-all duration-500"
              :style="{ width: `${dailyCompletionPercent}%` }"
            ></div>
          </div>

          <div class="space-y-3 text-xs">
            <div
              class="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50"
            >
              <div class="flex items-center gap-2">
                <i
                  :class="
                    completedAttendanceCount === todayScheduleItems.length &&
                    todayScheduleItems.length > 0
                      ? 'ri-checkbox-circle-fill text-emerald-600 text-sm'
                      : 'ri-checkbox-blank-circle-line text-slate-400 text-sm'
                  "
                ></i>
                <span class="font-medium text-slate-700 dark:text-slate-300">Presensi Siswa</span>
              </div>
              <span class="font-semibold text-slate-900 dark:text-slate-100 font-mono">
                {{ completedAttendanceCount }} / {{ todayScheduleItems.length }} Selesai
              </span>
            </div>

            <div
              class="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50"
            >
              <div class="flex items-center gap-2">
                <i
                  :class="
                    completedJournalCount === todayScheduleItems.length &&
                    todayScheduleItems.length > 0
                      ? 'ri-checkbox-circle-fill text-emerald-600 text-sm'
                      : 'ri-checkbox-blank-circle-line text-slate-400 text-sm'
                  "
                ></i>
                <span class="font-medium text-slate-700 dark:text-slate-300">Jurnal Mengajar</span>
              </div>
              <span class="font-semibold text-slate-900 dark:text-slate-100 font-mono">
                {{ completedJournalCount }} / {{ todayScheduleItems.length }} Selesai
              </span>
            </div>

            <div
              class="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50"
            >
              <div class="flex items-center gap-2">
                <i class="ri-time-line text-blue-500 text-sm"></i>
                <span class="font-medium text-slate-700 dark:text-slate-300"
                  >Total Jam Hari Ini</span
                >
              </div>
              <span class="font-semibold text-slate-900 dark:text-slate-100 font-mono">
                {{ todayScheduleHours }} JP Tatap Muka
              </span>
            </div>
          </div>
        </div>

        <div
          class="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between"
        >
          <span>Beban Mingguan Resmi:</span>
          <span class="font-mono font-bold text-slate-700 dark:text-slate-300"
            >{{ totalHours }} Jam / Minggu</span
          >
        </div>
      </div>
    </div>

    <!-- Academic Period Completeness & Submission Card (Existing & Reused) -->
    <TeacherSubmissionCard :teacher-id="currentSession?.teacherId || ''" />

    <!-- Structured Schedule & Spiritual Agenda Timeline (Section 3 & 5) -->
    <div
      class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-xs space-y-4"
    >
      <div
        class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 flex-wrap gap-2"
      >
        <div>
          <h2
            class="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"
          >
            <i class="ri-calendar-event-line text-emerald-600"></i> Jadwal Mengajar & Agenda Hari
            Ini
          </h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {{ formattedTodayDate }} &bull; FM.02.03.76.KUR.01.05 SMK NU Ungaran
          </p>
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 cursor-pointer"
          @click="goToSchedule"
        >
          Lihat Kalender Mingguan <i class="ri-arrow-right-line"></i>
        </button>
      </div>

      <div v-if="loading" class="py-12 text-center text-slate-400">
        Memuat jadwal tatap muka & agenda hari ini...
      </div>

      <div v-else class="space-y-3">
        <!-- Render Integrated Timeline Slots (Spiritual, Breaks, and Teaching Sessions) -->
        <div
          v-for="slot in integratedTimeline"
          :key="slot.key"
          class="rounded-xl border p-4 transition-all"
          :class="[
            slot.isTeaching
              ? slot.timingStatus === 'ONGOING'
                ? 'border-emerald-500/80 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-xs'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60'
              : 'border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30'
          ]"
        >
          <!-- Non-Teaching Slot (Dhuha, Istirahat, Dhuhur/Mujahadah) -->
          <div
            v-if="!slot.isTeaching"
            class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
          >
            <div class="flex items-center gap-3">
              <span
                class="font-mono font-semibold text-slate-600 dark:text-slate-400 px-2 py-0.5 bg-slate-200/80 dark:bg-slate-800 rounded"
              >
                {{ slot.timeStart }} – {{ slot.timeEnd }} WIB
              </span>
              <span
                class="px-2 py-0.5 rounded-full text-[11px] font-bold"
                :class="
                  slot.agendaCategory === 'SPIRITUAL'
                    ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                "
              >
                <i
                  :class="
                    slot.agendaCategory === 'SPIRITUAL' ? 'ri-star-line mr-1' : 'ri-cup-line mr-1'
                  "
                ></i>
                {{ slot.title }}
              </span>
            </div>
            <div class="text-[11px] text-slate-400"> Agenda Bersama Sekolah &bull; Non-KBM </div>
          </div>

          <!-- Teaching Session Slot -->
          <div v-else class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="space-y-1.5">
              <div class="flex items-center gap-2 flex-wrap">
                <span
                  class="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700"
                >
                  {{ slot.timeStart }} – {{ slot.timeEnd }} WIB
                </span>
                <span
                  class="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60"
                >
                  Jam {{ slot.periodStart }}-{{ slot.periodEnd }} ({{ slot.totalPeriods }} JP)
                </span>
                <span
                  v-if="slot.timingStatus === 'ONGOING'"
                  class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-600 text-white animate-pulse"
                >
                  SEDANG BERLANGSUNG
                </span>
                <span
                  v-else-if="slot.timingStatus === 'STARTING_SOON'"
                  class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-white"
                >
                  SEGERA DIMULAI
                </span>
                <span
                  v-else-if="slot.timingStatus === 'COMPLETED'"
                  class="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                >
                  SELESAI
                </span>
              </div>

              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="text-sm md:text-base font-bold text-slate-900 dark:text-slate-100">
                  {{ slot.subjectName }}
                </h3>
                <span
                  class="text-xs font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                >
                  {{ slot.className }}
                </span>
                <span class="text-xs text-slate-500 truncate max-w-xs">{{ slot.majorName }}</span>
              </div>

              <div class="flex items-center gap-3 text-xs text-slate-500">
                <span class="flex items-center gap-1">
                  <i class="ri-map-pin-2-line text-emerald-600"></i>
                  <span class="font-medium text-slate-700 dark:text-slate-300">{{
                    slot.roomName
                  }}</span>
                </span>
                <span>&bull;</span>
                <span
                  class="font-medium"
                  :class="
                    slot.attendanceDone
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-500'
                  "
                >
                  <i :class="slot.attendanceDone ? 'ri-checkbox-circle-fill' : 'ri-time-line'"></i>
                  Presensi: {{ slot.attendanceDone ? 'Selesai' : 'Belum' }}
                </span>
                <span>&bull;</span>
                <span
                  class="font-medium"
                  :class="
                    slot.journalDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
                  "
                >
                  <i :class="slot.journalDone ? 'ri-checkbox-circle-fill' : 'ri-time-line'"></i>
                  Jurnal: {{ slot.journalDone ? 'Selesai' : 'Belum' }}
                </span>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center gap-2 self-start md:self-center shrink-0">
              <button
                type="button"
                class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-xs"
                :class="
                  slot.attendanceDone
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                "
                @click="goToAttendance(slot.id)"
              >
                <i
                  :class="slot.attendanceDone ? 'ri-checkbox-circle-line' : 'ri-user-follow-line'"
                ></i>
                {{ slot.attendanceDone ? 'Edit Presensi' : 'Isi Presensi' }}
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-xs"
                :class="
                  slot.journalDone
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white'
                "
                @click="goToJournal(slot.id)"
              >
                <i :class="slot.journalDone ? 'ri-checkbox-circle-line' : 'ri-book-read-line'"></i>
                {{ slot.journalDone ? 'Edit Jurnal' : 'Isi Jurnal' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- School Agendas & Announcements (Section 22 & 23) -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- School Agenda Card -->
      <div
        class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-xs space-y-4"
      >
        <div
          class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3"
        >
          <h3
            class="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"
          >
            <i class="ri-calendar-todo-line text-emerald-600"></i> Agenda Sekolah Terdekat
          </h3>
          <span class="text-xs text-slate-500 font-mono">Target: Guru & Semua</span>
        </div>

        <div v-if="schoolAgendas.length === 0" class="py-8 text-center text-slate-400 text-xs">
          Belum ada agenda sekolah terdekat yang dijadwalkan.
        </div>

        <div v-else class="space-y-2.5">
          <div
            v-for="ag in schoolAgendas"
            :key="ag.id"
            class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3 text-xs"
          >
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span
                  class="px-2 py-0.5 text-[10px] font-bold rounded-md uppercase"
                  :class="getAgendaCategoryBadge(ag.category)"
                >
                  {{ ag.category }}
                </span>
                <span class="font-bold text-slate-900 dark:text-slate-100">{{ ag.title }}</span>
              </div>
              <p
                v-if="ag.description"
                class="text-slate-500 dark:text-slate-400 text-[11px] line-clamp-1"
              >
                {{ ag.description }}
              </p>
              <div class="text-[11px] text-slate-400 flex items-center gap-2">
                <span><i class="ri-calendar-line"></i> {{ ag.startDate }}</span>
                <span v-if="ag.location"
                  >&bull; <i class="ri-map-pin-line"></i> {{ ag.location }}</span
                >
              </div>
            </div>
            <span
              v-if="ag.isMandatory"
              class="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 shrink-0"
            >
              Wajib
            </span>
          </div>
        </div>
      </div>

      <!-- Announcements Card -->
      <div
        class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-xs space-y-4"
      >
        <div
          class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3"
        >
          <h3
            class="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"
          >
            <i class="ri-notification-badge-line text-emerald-600"></i> Pengumuman & Pemberitahuan
          </h3>
          <span class="text-xs text-slate-500 font-mono">{{ announcements.length }} Informasi</span>
        </div>

        <div v-if="announcements.length === 0" class="py-8 text-center text-slate-400 text-xs">
          Belum ada pengumuman resmi yang dipublikasikan.
        </div>

        <div v-else class="space-y-2.5">
          <div
            v-for="anc in announcements"
            :key="anc.id"
            class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer space-y-1.5"
            @click="openAnnouncementModal(anc)"
          >
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <i
                  v-if="anc.pinned || anc.isPinned"
                  class="ri-pushpin-fill text-amber-500 text-xs"
                  title="Disematkan"
                ></i>
                <h4 class="font-bold text-slate-900 dark:text-slate-100 text-xs">{{
                  anc.title
                }}</h4>
              </div>
              <span class="text-[10px] text-slate-400 font-mono">{{
                formatDateShort(anc.createdAt)
              }}</span>
            </div>
            <p class="text-slate-600 dark:text-slate-400 text-xs line-clamp-2">
              {{ anc.content }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Notification Settings Dialog (Section 24) -->
    <ElDialog
      v-model="notificationModalVisible"
      title="Pengaturan Notifikasi Jadwal Mengajar"
      width="480px"
      append-to-body
    >
      <div class="space-y-4 text-xs">
        <p class="text-slate-600 dark:text-slate-400">
          Atur pengingat otomatis untuk jadwal mengajar Anda agar tidak terlambat memasuki kelas.
        </p>

        <div
          class="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60"
        >
          <div>
            <div class="font-semibold text-slate-900 dark:text-slate-100"
              >Aktifkan Pengingat Jadwal</div
            >
            <div class="text-[11px] text-slate-500">Kirim notifikasi in-app & browser</div>
          </div>
          <ElSwitch v-model="notificationSettings.enabled" />
        </div>

        <div class="space-y-1.5">
          <label class="block font-semibold text-slate-700 dark:text-slate-300"
            >Waktu Pengingat Sebelum Mulai</label
          >
          <ElSelect v-model="notificationSettings.leadTimeMinutes" class="w-full">
            <ElOption :value="3" label="3 Menit Sebelum Sesi Mulai" />
            <ElOption :value="5" label="5 Menit Sebelum Sesi Mulai (Standar)" />
            <ElOption :value="10" label="10 Menit Sebelum Sesi Mulai" />
            <ElOption :value="15" label="15 Menit Sebelum Sesi Mulai" />
          </ElSelect>
        </div>

        <div
          class="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60"
        >
          <div>
            <div class="font-semibold text-slate-900 dark:text-slate-100"
              >Notifikasi Tepat Saat Jam Mulai</div
            >
            <div class="text-[11px] text-slate-500">Peringatan saat jam tatap muka berbunyi</div>
          </div>
          <ElSwitch v-model="notificationSettings.notifyOnStart" />
        </div>

        <div class="space-y-1.5">
          <label class="block font-semibold text-slate-700 dark:text-slate-300"
            >Peringatan Akhir Jam Mengajar</label
          >
          <ElSelect v-model="notificationSettings.notifyBeforeEndMinutes" class="w-full">
            <ElOption :value="5" label="5 Menit Sebelum Jam Berakhir" />
            <ElOption :value="10" label="10 Menit Sebelum Jam Berakhir (Standar)" />
            <ElOption :value="15" label="15 Menit Sebelum Jam Berakhir" />
          </ElSelect>
        </div>

        <div class="pt-2">
          <ElButton
            v-if="!hasBrowserNotificationPermission"
            type="primary"
            plain
            size="small"
            class="w-full"
            @click="requestBrowserNotification"
          >
            <i class="ri-notification-badge-line mr-1"></i> Izinkan Notifikasi Browser
          </ElButton>
          <span
            v-else
            class="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1"
          >
            <i class="ri-checkbox-circle-fill"></i> Izin notifikasi browser aktif.
          </span>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="notificationModalVisible = false">Tutup</ElButton>
          <ElButton type="primary" @click="saveNotificationSettings">Simpan Pengaturan</ElButton>
        </div>
      </template>
    </ElDialog>

    <!-- Announcement Detail Dialog -->
    <ElDialog
      v-model="announcementModalVisible"
      :title="selectedAnnouncement?.title || 'Pengumuman Resmi'"
      width="540px"
      append-to-body
    >
      <div v-if="selectedAnnouncement" class="space-y-4">
        <div class="flex items-center justify-between text-xs text-slate-500 border-b pb-2">
          <span>Target: {{ selectedAnnouncement.targetRole || 'Semua Pengguna' }}</span>
          <span class="font-mono">{{ formatDateShort(selectedAnnouncement.createdAt) }}</span>
        </div>
        <div class="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
          {{ selectedAnnouncement.content }}
        </div>
      </div>
      <template #footer>
        <ElButton @click="announcementModalVisible = false">Tutup</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, onUnmounted, computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { ElButton, ElDialog, ElSelect, ElOption, ElSwitch, ElMessage } from 'element-plus'
  import { authService } from '@/core/services/auth'
  import TeacherSubmissionCard from './components/TeacherSubmissionCard.vue'
  import { repositories } from '@/core/repositories'
  import { syncService } from '@/core/services/sync'
  import {
    scheduleService,
    getTodayDayOfWeek,
    type TeacherResolvedScheduleItem
  } from '@/core/services/master/ScheduleService'
  import { schoolAgendaService } from '@/core/services/agenda/SchoolAgendaService'
  import { announcementService } from '@/core/services/announcement/AnnouncementService'
  import {
    teacherScheduleNotificationService,
    type ScheduleAlert,
    type ScheduleNotificationSettings
  } from '@/core/services/notification/TeacherScheduleNotificationService'
  import type {
    SessionData,
    TeacherAssignmentEntity,
    SubjectEntity,
    SchoolAgendaEntity,
    AnnouncementEntity
  } from '@/core/types'

  defineOptions({ name: 'TeacherDashboard' })

  const router = useRouter()
  const currentSession = ref<SessionData | null>(null)
  const teacherName = ref('')
  const academicYearName = ref('')
  const semesterName = ref('')
  const loading = ref(true)
  const syncing = ref(false)
  const pendingSyncCount = ref(0)
  const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const teacherAssignments = ref<TeacherAssignmentEntity[]>([])
  const subjectMap = ref<Map<string, string>>(new Map())
  const todayScheduleItems = ref<TeacherResolvedScheduleItem[]>([])
  const schoolAgendas = ref<SchoolAgendaEntity[]>([])
  const announcements = ref<AnnouncementEntity[]>([])

  // Ticking real-time clock & live countdown
  const currentTime = ref(new Date())
  let liveTickerTimer: any = null

  // Schedule Alerts & Notifications
  const activeAlert = ref<ScheduleAlert | null>(null)
  const notificationModalVisible = ref(false)
  const announcementModalVisible = ref(false)
  const selectedAnnouncement = ref<AnnouncementEntity | null>(null)
  const notificationSettings = ref<ScheduleNotificationSettings>(
    teacherScheduleNotificationService.getSettings()
  )
  const hasBrowserNotificationPermission = ref(
    teacherScheduleNotificationService.hasNotificationPermission()
  )

  let alertUnsubscribe: (() => void) | null = null
  let scheduleTimerInterval: any = null

  const todayDayName = computed(() => getTodayDayOfWeek())

  const formattedTodayDate = computed(() => {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date())
  })

  const totalHours = computed(() => {
    return teacherAssignments.value.reduce((acc, curr) => acc + (curr.hours || 0), 0)
  })

  const todayScheduleHours = computed(() => {
    return todayScheduleItems.value.reduce((acc, curr) => acc + curr.totalPeriods, 0)
  })

  const completedAttendanceCount = computed(() => {
    return todayScheduleItems.value.filter((s) => s.attendanceDone).length
  })

  const completedJournalCount = computed(() => {
    return todayScheduleItems.value.filter((s) => s.journalDone).length
  })

  const dailyCompletionPercent = computed(() => {
    if (todayScheduleItems.value.length === 0) return 100
    const totalTasks = todayScheduleItems.value.length * 2 // attendance + journal
    const completedTasks = completedAttendanceCount.value + completedJournalCount.value
    return Math.round((completedTasks / totalTasks) * 100)
  })

  /**
   * Determine Next Class dynamically based on current time + today's structured schedule
   */
  const nextClassData = computed(() => {
    if (todayScheduleItems.value.length === 0) return null

    const now = currentTime.value
    const curMin = now.getHours() * 60 + now.getMinutes()

    // 1. Check if any class is currently ongoing
    for (const item of todayScheduleItems.value) {
      const startMin = teacherScheduleNotificationService.parseTimeToMinutes(item.timeStart)
      const endMin = teacherScheduleNotificationService.parseTimeToMinutes(item.timeEnd)
      if (curMin >= startMin && curMin < endMin) {
        return {
          ...item,
          timingStatus: 'ONGOING' as const
        }
      }
    }

    // 2. Find the earliest upcoming class that hasn't started yet
    const upcoming = todayScheduleItems.value
      .map((item) => {
        const startMin = teacherScheduleNotificationService.parseTimeToMinutes(item.timeStart)
        return { item, startMin }
      })
      .filter((u) => u.startMin > curMin)
      .sort((a, b) => a.startMin - b.startMin)

    if (upcoming.length > 0) {
      const next = upcoming[0]
      const wait = next.startMin - curMin
      return {
        ...next.item,
        timingStatus: (wait <= 15 ? 'STARTING_SOON' : 'UPCOMING') as 'STARTING_SOON' | 'UPCOMING'
      }
    }

    // 3. All classes completed
    return null
  })

  /**
   * Precise second-by-second live countdown, elapsed timer and progress bar
   */
  const liveClassCountdown = computed(() => {
    if (!nextClassData.value) return null
    const now = currentTime.value
    const curSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()

    const startMin = teacherScheduleNotificationService.parseTimeToMinutes(
      nextClassData.value.timeStart
    )
    const endMin = teacherScheduleNotificationService.parseTimeToMinutes(
      nextClassData.value.timeEnd
    )
    const startSec = startMin * 60
    const endSec = endMin * 60

    const formatSec = (seconds: number) => {
      const h = Math.floor(seconds / 3600)
      const m = Math.floor((seconds % 3600) / 60)
      const s = Math.floor(seconds % 60)
      const pad = (n: number) => String(n).padStart(2, '0')
      return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
    }

    if (curSec >= startSec && curSec < endSec) {
      const totalSec = endSec - startSec
      const elapsedSec = curSec - startSec
      const remainingSec = endSec - curSec

      const formattedTime = formatSec(remainingSec)
      const formattedElapsed = formatSec(elapsedSec)
      const totalDurationMin = Math.round(totalSec / 60)
      const percent = Math.min(100, Math.max(0, Math.round((elapsedSec / totalSec) * 100)))

      return {
        type: 'ONGOING' as const,
        remainingSec,
        elapsedSec,
        formattedTime,
        formattedElapsed,
        totalDurationMin,
        percent,
        label: `Sisa ${formattedTime}`
      }
    } else if (startSec > curSec) {
      const waitSec = startSec - curSec
      const formattedTime = formatSec(waitSec)

      return {
        type: 'UPCOMING' as const,
        waitSec,
        formattedTime,
        percent: 0,
        label: `Mulai ${formattedTime}`
      }
    }

    return null
  })

  /**
   * Subsequent class coming up later today
   */
  const followingClassData = computed(() => {
    if (!nextClassData.value || todayScheduleItems.value.length === 0) return null
    const currentId = nextClassData.value.id
    const curStartMin = teacherScheduleNotificationService.parseTimeToMinutes(
      nextClassData.value.timeStart
    )

    const remaining = todayScheduleItems.value
      .filter((item) => item.id !== currentId)
      .map((item) => ({
        item,
        startMin: teacherScheduleNotificationService.parseTimeToMinutes(item.timeStart)
      }))
      .filter((x) => x.startMin >= curStartMin)
      .sort((a, b) => a.startMin - b.startMin)

    return remaining.length > 0 ? remaining[0].item : null
  })

  /**
   * Integrated Timeline with Canonical Spiritual & Break Agendas (Section 5)
   */
  const integratedTimeline = computed(() => {
    const items: Array<{
      key: string
      timeStart: string
      timeEnd: string
      isTeaching: boolean
      title?: string
      agendaCategory?: 'SPIRITUAL' | 'BREAK'
      id?: string
      className?: string
      subjectName?: string
      roomName?: string
      majorName?: string
      periodStart?: number
      periodEnd?: number
      totalPeriods?: number
      timingStatus?: string
      attendanceDone?: boolean
      journalDone?: boolean
    }> = []

    // Canonical spiritual & break slots
    const isFriday = todayDayName.value === 'JUMAT'
    const nonTeachingSlots = [
      {
        key: 'dhuha',
        timeStart: '06:45',
        timeEnd: '07:00',
        title: 'Sholat Dhuha Berjamaah',
        agendaCategory: 'SPIRITUAL' as const
      },
      {
        key: 'break1',
        timeStart: '09:30',
        timeEnd: '09:45',
        title: 'Istirahat 1',
        agendaCategory: 'BREAK' as const
      },
      {
        key: 'dhuhur',
        timeStart: '11:45',
        timeEnd: '12:30',
        title: isFriday ? 'Sholat Jumat & Mujahadah' : 'Sholat Dhuhur Berjamaah',
        agendaCategory: 'SPIRITUAL' as const
      },
      {
        key: 'break2',
        timeStart: '14:00',
        timeEnd: '14:15',
        title: 'Istirahat 2',
        agendaCategory: 'BREAK' as const
      }
    ]

    nonTeachingSlots.forEach((slot) => {
      items.push({
        key: slot.key,
        timeStart: slot.timeStart,
        timeEnd: slot.timeEnd,
        isTeaching: false,
        title: slot.title,
        agendaCategory: slot.agendaCategory
      })
    })

    // Teaching items
    todayScheduleItems.value.forEach((t) => {
      const timing = teacherScheduleNotificationService.getTimingStatus(t.timeStart, t.timeEnd)
      items.push({
        key: `teach_${t.id}`,
        id: t.id,
        timeStart: t.timeStart,
        timeEnd: t.timeEnd,
        isTeaching: true,
        className: t.className,
        subjectName: t.subjectName,
        roomName: t.roomName,
        majorName: t.majorName,
        periodStart: t.periodStart,
        periodEnd: t.periodEnd,
        totalPeriods: t.totalPeriods,
        timingStatus: timing.status,
        attendanceDone: t.attendanceDone,
        journalDone: t.journalDone
      })
    })

    // Sort chronologically by start time
    return items.sort((a, b) => {
      const minA = teacherScheduleNotificationService.parseTimeToMinutes(a.timeStart)
      const minB = teacherScheduleNotificationService.parseTimeToMinutes(b.timeStart)
      return minA - minB
    })
  })

  // Quick Action Routing (Section 21)
  const handleQuickAttendance = () => {
    if (nextClassData.value?.id) {
      goToAttendance(nextClassData.value.id)
    } else {
      goToAttendance()
    }
  }

  const handleQuickJournal = () => {
    if (nextClassData.value?.id) {
      goToJournal(nextClassData.value.id)
    } else {
      goToJournal()
    }
  }

  const goToSchedule = () => router.push('/teacher/schedule')
  const goToAttendance = (scheduleId?: string) => {
    if (scheduleId) {
      router.push({ path: '/teacher/attendance', query: { scheduleId } })
    } else {
      router.push('/teacher/attendance')
    }
  }
  const goToJournal = (scheduleId?: string) => {
    if (scheduleId) {
      router.push({ path: '/teacher/journal', query: { scheduleId } })
    } else {
      router.push('/teacher/journal')
    }
  }
  const goToAssessment = () => router.push('/teacher/assessment')
  const goToDiscipline = () => router.push('/teacher/discipline')

  const dismissAlert = () => {
    activeAlert.value = null
  }

  const openNotificationSettingsModal = () => {
    notificationSettings.value = teacherScheduleNotificationService.getSettings()
    hasBrowserNotificationPermission.value =
      teacherScheduleNotificationService.hasNotificationPermission()
    notificationModalVisible.value = true
  }

  const requestBrowserNotification = async () => {
    const granted = await teacherScheduleNotificationService.requestNotificationPermission()
    hasBrowserNotificationPermission.value = granted
    if (granted) {
      ElMessage.success('Izin notifikasi browser berhasil diaktifkan.')
    } else {
      ElMessage.warning('Izin notifikasi belum diberikan atau diblokir browser.')
    }
  }

  const saveNotificationSettings = () => {
    teacherScheduleNotificationService.saveSettings(notificationSettings.value)
    notificationModalVisible.value = false
    ElMessage.success('Pengaturan notifikasi berhasil disimpan.')
  }

  const openAnnouncementModal = (anc: AnnouncementEntity) => {
    selectedAnnouncement.value = anc
    announcementModalVisible.value = true
  }

  const formatDateShort = (iso?: string) => {
    if (!iso) return ''
    try {
      const d = new Date(iso)
      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
    } catch {
      return ''
    }
  }

  const getAgendaCategoryBadge = (category: string) => {
    switch (category) {
      case 'AKADEMIK':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
      case 'UJIAN':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
      case 'LIBUR':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
      case 'RAPAT':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
      default:
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
    }
  }

  const loadSyncStatus = async () => {
    pendingSyncCount.value = await syncService.getPendingCount()
  }

  const handleSyncNow = async () => {
    syncing.value = true
    try {
      const res = await syncService.syncAll()
      if (res.syncedCount > 0 && res.failedCount === 0) {
        ElMessage.success(`Berhasil menyinkronkan ${res.syncedCount} data lokal.`)
      } else if (res.failedCount > 0) {
        const firstErr = res.errors && res.errors.length > 0 ? res.errors[0] : ''
        ElMessage.error(`Gagal menyinkronkan ${res.failedCount} data. ${firstErr}`)
      } else {
        ElMessage.info('Semua data lokal sudah tersinkronisasi.')
      }
      await loadSyncStatus()
    } catch (err: any) {
      ElMessage.error(err?.message || 'Gagal menyinkronkan data.')
    } finally {
      syncing.value = false
    }
  }

  const updateOnlineStatus = () => {
    isOnline.value = typeof navigator !== 'undefined' ? navigator.onLine : true
  }

  const evaluateAlerts = () => {
    if (todayScheduleItems.value.length === 0) return
    const alerts = teacherScheduleNotificationService.evaluateScheduleAlerts(
      todayScheduleItems.value
    )
    if (alerts.length > 0) {
      activeAlert.value = alerts[0]
      teacherScheduleNotificationService.dispatchAlert(alerts[0])
    }
  }

  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
    if (alertUnsubscribe) alertUnsubscribe()
    if (scheduleTimerInterval) clearInterval(scheduleTimerInterval)
    if (liveTickerTimer) clearInterval(liveTickerTimer)
  })

  onMounted(async () => {
    // Start second-by-second live clock ticker
    liveTickerTimer = setInterval(() => {
      currentTime.value = new Date()
    }, 1000)
    if (typeof window !== 'undefined') {
      window.addEventListener('online', updateOnlineStatus)
      window.addEventListener('offline', updateOnlineStatus)
    }

    // Subscribe to in-app alerts
    alertUnsubscribe = teacherScheduleNotificationService.onInAppAlert((alert) => {
      activeAlert.value = alert
    })

    await loadSyncStatus()
    currentSession.value = authService.getCurrentSession()
    if (!currentSession.value || currentSession.value.role !== 'GURU') {
      return
    }

    teacherName.value = currentSession.value.teacherName || ''
    const teacherId = currentSession.value.teacherId

    if (teacherId) {
      loading.value = true
      try {
        const [assignments, subjects, teacher, activeAy, schedData, agendas, anncs] =
          await Promise.all([
            repositories.teacherAssignments.findByTeacherId(teacherId),
            repositories.subjects.findAll(),
            repositories.teachers.findById(teacherId),
            repositories.academicYears.findActive(),
            scheduleService.getTeacherSchedule(teacherId),
            schoolAgendaService.getAgendasForRole('GURU'),
            announcementService.getPublishedAnnouncements('GURU')
          ])

        teacherAssignments.value = assignments
        if (teacher) {
          teacherName.value = teacher.name
        }

        if (activeAy) {
          academicYearName.value = activeAy.name
          semesterName.value = activeAy.semester
        }

        todayScheduleItems.value = schedData.todaySchedules
        schoolAgendas.value = agendas.slice(0, 5) // Recent 5
        announcements.value = anncs.slice(0, 5) // Recent 5

        const sMap = new Map<string, string>()
        subjects.forEach((s: SubjectEntity) => sMap.set(s.id, s.name))
        subjectMap.value = sMap

        // Initial alert evaluation
        evaluateAlerts()

        // Check for schedule alerts every 30 seconds
        scheduleTimerInterval = setInterval(() => {
          evaluateAlerts()
        }, 30000)
      } catch (err) {
        console.warn('[TeacherDashboard] Error loading dashboard data:', err)
      } finally {
        loading.value = false
      }
    }
  })
</script>
