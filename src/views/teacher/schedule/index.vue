<template>
  <div class="p-5 space-y-5">
    <!-- Top Header Card -->
    <div class="art-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <span
            class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
          >
            OFFLINE DATABASE
          </span>
          <span
            class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-400 border border-teal-200 dark:border-teal-800"
          >
            PORTAL GURU
          </span>
        </div>
        <h1
          class="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2 flex items-center gap-2"
        >
          <i class="ri-calendar-schedule-line text-emerald-600"></i> Jadwal Mengajar Guru
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          <span class="font-semibold text-gray-800 dark:text-gray-200">{{ teacherName }}</span>
          <span v-if="academicYearName">
            &bull; TP {{ academicYearName }} (Semester {{ semesterName }})</span
          >
        </p>
      </div>

      <div class="flex items-center gap-3">
        <ElButton plain :loading="loading" @click="loadScheduleData">
          <i class="ri-refresh-line mr-1"></i> Segarkan
        </ElButton>
        <ElButton type="primary" plain @click="goToDashboard">
          <i class="ri-dashboard-line mr-1"></i> Dashboard
        </ElButton>
      </div>
    </div>

    <!-- Error / Auth / No Academic Year State -->
    <div
      v-if="errorMessage"
      class="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl p-6 text-center text-rose-700 dark:text-rose-300 space-y-2"
    >
      <i class="ri-error-warning-line text-3xl"></i>
      <div class="font-semibold text-base">{{ errorMessage }}</div>
      <p class="text-sm text-rose-600/80 dark:text-rose-400/80">
        Pastikan akun Anda terhubung dengan data Guru di master data sekolah dan tahun pelajaran
        aktif telah dikonfigurasi.
      </p>
    </div>

    <template v-else>
      <!-- Top Stat Banners Inspired by Reference Design -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        <!-- Banner 1: Productive Time Today (Coral Accent) -->
        <div
          class="bg-gradient-to-br from-[#f97316] to-[#ea580c] text-white rounded-2xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden min-h-[120px]"
        >
          <div class="flex items-center justify-between">
            <span
              class="text-xs font-bold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-xs"
            >
              {{ todayDayName || 'HARI INI' }}
            </span>
            <span
              class="px-2.5 py-1 text-xs font-bold rounded-full bg-white text-orange-600 shadow-xs"
            >
              {{ dailyProductiveRate }}% Produktif
            </span>
          </div>

          <div class="mt-3 flex items-baseline justify-between">
            <div>
              <div class="text-xs text-orange-100 font-medium">Beban Mengajar Hari Ini</div>
              <div class="text-2xl md:text-3xl font-bold tracking-tight">
                {{ scheduleData?.todaySummary.totalHours || 0 }}
                <span class="text-lg font-medium text-orange-100">JP</span>
              </div>
            </div>
            <div class="text-right">
              <div class="text-xs text-orange-100 font-medium">Durasi Tatap Muka</div>
              <div class="text-xl font-mono font-bold"
                >{{ (scheduleData?.todaySummary.totalHours || 0) * 45 }}m</div
              >
            </div>
          </div>
        </div>

        <!-- Banner 2: Weekly Productive Load (Purple Accent) -->
        <div
          class="bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] text-white rounded-2xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden min-h-[120px]"
        >
          <div class="flex items-center justify-between">
            <span
              class="text-xs font-bold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-xs"
            >
              TOTAL MINGGUAN
            </span>
            <span
              class="px-2.5 py-1 text-xs font-bold rounded-full bg-white text-purple-700 shadow-xs"
            >
              91% Alokasi
            </span>
          </div>

          <div class="mt-3 flex items-baseline justify-between">
            <div>
              <div class="text-xs text-purple-100 font-medium">Total Beban Mengajar</div>
              <div class="text-2xl md:text-3xl font-bold tracking-tight">
                {{ totalWeeklyHours }}
                <span class="text-lg font-medium text-purple-100">JP / Mgg</span>
              </div>
            </div>
            <div class="text-right">
              <div class="text-xs text-purple-100 font-medium">Jumlah Sesi</div>
              <div class="text-xl font-mono font-bold"
                >{{ scheduleData?.schedules.length || 0 }} Sesi</div
              >
            </div>
          </div>
        </div>

        <!-- Banner 3: Next Event Widget -->
        <div
          class="art-card p-5 flex flex-col justify-between border border-slate-200/80 dark:border-slate-800"
        >
          <div class="flex items-center justify-between mb-2">
            <span
              class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
            >
              Kelas / Sesi Saat Ini & Selanjutnya
            </span>
            <span
              v-if="scheduleData?.todaySummary.currentSession"
              class="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-600 text-white animate-pulse"
            >
              SEDANG BERLANGSUNG
            </span>
            <span
              v-else-if="scheduleData?.todaySummary.nextSession"
              class="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-600 text-white"
            >
              AKAN DATANG
            </span>
          </div>

          <div v-if="scheduleData?.todaySummary.currentSession" class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 text-xl font-bold"
            >
              <i class="ri-broadcast-line animate-pulse"></i>
            </div>
            <div class="truncate flex-1">
              <div class="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                {{ scheduleData.todaySummary.currentSession.subjectName }}
              </div>
              <div
                class="text-xs text-slate-500 flex items-center justify-between gap-1 mt-0.5 font-mono"
              >
                <span
                  >{{ scheduleData.todaySummary.currentSession.className }} &bull;
                  {{ scheduleData.todaySummary.currentSession.timeStart }}-{{
                    scheduleData.todaySummary.currentSession.timeEnd
                  }}</span
                >
                <span class="font-bold text-emerald-600 dark:text-emerald-400">
                  Sisa
                  {{
                    getSessionLiveTimer(scheduleData.todaySummary.currentSession)
                      .remainingFormatted || ''
                  }}
                </span>
              </div>
            </div>
          </div>

          <div v-else-if="scheduleData?.todaySummary.nextSession" class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 text-xl font-bold"
            >
              <i class="ri-calendar-event-line"></i>
            </div>
            <div class="truncate flex-1">
              <div class="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                {{ scheduleData.todaySummary.nextSession.subjectName }}
              </div>
              <div
                class="text-xs text-slate-500 flex items-center justify-between gap-1 mt-0.5 font-mono"
              >
                <span
                  >{{ scheduleData.todaySummary.nextSession.className }} &bull;
                  {{ scheduleData.todaySummary.nextSession.timeStart }} WIB</span
                >
                <span
                  v-if="getSessionLiveTimer(scheduleData.todaySummary.nextSession).waitFormatted"
                  class="font-bold text-blue-600 dark:text-blue-400"
                >
                  Mulai
                  {{ getSessionLiveTimer(scheduleData.todaySummary.nextSession).waitFormatted }}
                </span>
              </div>
            </div>
          </div>

          <div v-else class="text-xs text-slate-400 italic">
            Seluruh sesi tatap muka hari ini telah selesai.
          </div>
        </div>
      </div>

      <!-- Main Content Container with Tabs -->
      <div class="art-card p-5 space-y-5">
        <div
          class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-4"
        >
          <ElRadioGroup v-model="activeViewMode" size="default">
            <ElRadioButton value="WEEKLY">
              <i class="ri-calendar-2-line mr-1"></i> Jadwal Mingguan
            </ElRadioButton>
            <ElRadioButton value="TODAY">
              <i class="ri-sun-line mr-1"></i> Hari Ini ({{
                scheduleData?.todaySchedules.length || 0
              }})
            </ElRadioButton>
            <ElRadioButton value="GRID">
              <i class="ri-grid-line mr-1"></i> Matriks Kalender
            </ElRadioButton>
          </ElRadioGroup>

          <div
            v-if="activeViewMode === 'WEEKLY'"
            class="flex items-center gap-1 overflow-x-auto py-1"
          >
            <button
              v-for="day in dayFilterOptions"
              :key="day.value"
              class="px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
              :class="[
                selectedDayFilter === day.value
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              ]"
              @click="selectedDayFilter = day.value"
            >
              {{ day.label }}
              <span
                v-if="day.count !== undefined"
                class="ml-1 px-1.5 py-0.2 rounded-full text-[10px]"
                :class="
                  selectedDayFilter === day.value
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                "
              >
                {{ day.count }}
              </span>
            </button>
          </div>
        </div>

        <!-- VIEW 1: WEEKLY SCHEDULE CARDS -->
        <div v-if="activeViewMode === 'WEEKLY'" class="space-y-6">
          <div
            v-if="filteredDaysWithSchedules.length === 0"
            class="py-12 text-center text-gray-400 space-y-2"
          >
            <i class="ri-calendar-close-line text-4xl text-gray-300 dark:text-gray-600"></i>
            <div class="font-medium text-gray-600 dark:text-gray-300">
              Belum ada jadwal mengajar untuk akun ini.
            </div>
            <p class="text-xs text-gray-400">
              Silakan hubungi bagian kurikulum jika jadwal mengajar belum terinput di master jadwal.
            </p>
          </div>

          <div v-for="dayGroup in filteredDaysWithSchedules" :key="dayGroup.day" class="space-y-3">
            <!-- Day Section Header -->
            <div
              class="flex items-center justify-between bg-gray-50 dark:bg-gray-800/60 px-4 py-2.5 rounded-lg border border-gray-100 dark:border-gray-800"
            >
              <div class="flex items-center gap-2">
                <span
                  class="font-bold text-gray-900 dark:text-gray-100 text-sm tracking-wide uppercase"
                >
                  {{ dayGroup.day }}
                </span>
                <span
                  v-if="todayDayName === dayGroup.day"
                  class="px-2 py-0.2 text-[11px] font-bold rounded bg-emerald-600 text-white"
                >
                  HARI INI
                </span>
              </div>
              <div class="text-xs text-gray-500 font-medium">
                {{ dayGroup.schedules.length }} Sesi Mengajar &bull;
                {{ dayGroup.schedules.reduce((acc, curr) => acc + curr.totalPeriods, 0) }} Jam
                Pelajaran (JP)
              </div>
            </div>

            <!-- Empty State for Day with 0 schedules -->
            <div
              v-if="dayGroup.schedules.length === 0"
              class="bg-gray-50/50 dark:bg-gray-900/30 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-6 text-center text-sm text-gray-400"
            >
              Tidak ada jadwal mengajar pada hari {{ dayGroup.day }}.
            </div>

            <!-- Schedule Cards Grid -->
            <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <div
                v-for="item in dayGroup.schedules"
                :key="item.id"
                class="group bg-white dark:bg-[#202024] rounded-xl border p-4 transition-all duration-200 hover:shadow-md cursor-pointer relative flex flex-col justify-between"
                :class="[
                  item.timingStatus === 'ONGOING'
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/10'
                    : 'border-gray-200 dark:border-gray-800 hover:border-emerald-300 dark:hover:border-emerald-700'
                ]"
                @click="openSessionDetail(item)"
              >
                <!-- Top Meta: Time & Period -->
                <div>
                  <div class="flex items-start justify-between gap-2 mb-2">
                    <div class="flex flex-wrap items-center gap-1.5">
                      <span
                        class="px-2 py-0.5 text-xs font-bold rounded bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-mono"
                      >
                        {{ item.timeStart }} – {{ item.timeEnd }}
                      </span>
                      <span
                        class="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                      >
                        Jam ke-{{ item.periodStart }} s.d {{ item.periodEnd }} ({{
                          item.totalPeriods
                        }}
                        JP)
                      </span>
                    </div>

                    <!-- Timing Status Badge -->
                    <span
                      v-if="item.timingStatus === 'ONGOING'"
                      class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-600 text-white animate-pulse"
                    >
                      BERLANGSUNG
                    </span>
                    <span
                      v-else-if="item.timingStatus === 'UPCOMING'"
                      class="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    >
                      BERIKUTNYA
                    </span>
                    <span
                      v-else-if="item.timingStatus === 'COMPLETED'"
                      class="px-2 py-0.5 text-[10px] font-medium rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                    >
                      SELESAI
                    </span>
                  </div>

                  <!-- Subject Title -->
                  <h3
                    class="text-base font-bold text-gray-900 dark:text-gray-100 leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors"
                  >
                    {{ item.subjectName }}
                  </h3>

                  <!-- Class & Major Info -->
                  <div
                    class="mt-2 text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2"
                  >
                    <span
                      class="font-bold text-gray-900 dark:text-gray-200 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded"
                    >
                      {{ item.className }}
                    </span>
                    <span class="truncate">{{ item.majorName }}</span>
                  </div>
                </div>

                <!-- Bottom Meta: Room & Assignment Code -->
                <div
                  class="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500"
                >
                  <div class="flex items-center gap-1.5">
                    <i class="ri-map-pin-2-line text-emerald-600"></i>
                    <span class="font-medium text-gray-700 dark:text-gray-300">{{
                      item.roomName
                    }}</span>
                  </div>
                  <div class="font-mono text-gray-400"> SK: {{ item.teacherAssignmentCode }} </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- VIEW 2: TODAY ONLY SCHEDULE VIEW -->
        <div v-else-if="activeViewMode === 'TODAY'" class="space-y-4">
          <div
            v-if="!scheduleData || scheduleData.todaySchedules.length === 0"
            class="py-12 text-center text-gray-400 space-y-2 bg-gray-50/50 dark:bg-gray-900/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-800"
          >
            <i class="ri-sun-line text-4xl text-gray-300 dark:text-gray-600"></i>
            <div class="font-semibold text-gray-700 dark:text-gray-300 text-base">
              Tidak ada jadwal mengajar hari ini ({{ todayDayName || 'Hari Ini' }}).
            </div>
            <p class="text-xs text-gray-400">
              Gunakan tab "Jadwal Mingguan" untuk melihat seluruh jadwal mengajar Anda di hari lain.
            </p>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="item in scheduleData.todaySchedules"
              :key="item.id"
              class="bg-white dark:bg-[#202024] rounded-xl border p-5 transition-all hover:shadow-md cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              :class="[
                item.timingStatus === 'ONGOING'
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20'
                  : 'border-gray-200 dark:border-gray-800 hover:border-emerald-300'
              ]"
              @click="openSessionDetail(item)"
            >
              <div class="flex items-start md:items-center gap-4">
                <div
                  class="w-12 h-12 rounded-xl flex flex-col items-center justify-center font-mono flex-shrink-0"
                  :class="[
                    item.timingStatus === 'ONGOING'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  ]"
                >
                  <span class="text-xs">Jam</span>
                  <span class="text-sm font-bold leading-none"
                    >{{ item.periodStart }}-{{ item.periodEnd }}</span
                  >
                </div>

                <div class="space-y-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="font-mono text-xs font-bold text-gray-600 dark:text-gray-300">
                      {{ item.timeStart }} – {{ item.timeEnd }} WIB
                    </span>
                    <span
                      class="px-2 py-0.5 text-xs font-bold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    >
                      {{ item.className }}
                    </span>
                    <span
                      v-if="item.timingStatus === 'ONGOING'"
                      class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-600 text-white animate-pulse flex items-center gap-1 font-mono"
                    >
                      <i class="ri-timer-line"></i> SEDANG BERLANGSUNG
                      <template v-if="getSessionLiveTimer(item).status === 'ONGOING'">
                        (Sisa {{ getSessionLiveTimer(item).remainingFormatted }})
                      </template>
                    </span>
                    <span
                      v-else-if="item.timingStatus === 'UPCOMING'"
                      class="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-mono"
                    >
                      SESI BERIKUTNYA
                      <template v-if="getSessionLiveTimer(item).status === 'UPCOMING'">
                        (Mulai {{ getSessionLiveTimer(item).waitFormatted }})
                      </template>
                    </span>
                  </div>

                  <h3 class="text-base font-bold text-gray-900 dark:text-gray-100">
                    {{ item.subjectName }}
                  </h3>

                  <div class="text-xs text-gray-500 flex items-center gap-3">
                    <span><i class="ri-building-line mr-1"></i>{{ item.roomName }}</span>
                    <span>&bull;</span>
                    <span><i class="ri-folder-user-line mr-1"></i>{{ item.majorName }}</span>
                    <span>&bull;</span>
                    <span>SK: {{ item.teacherAssignmentCode }} ({{ item.totalPeriods }} JP)</span>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <ElButton
                  size="small"
                  :type="item.attendanceDone ? 'info' : 'success'"
                  plain
                  @click.stop="goToAttendance(item.id)"
                >
                  <i
                    :class="item.attendanceDone ? 'ri-checkbox-circle-line' : 'ri-user-follow-line'"
                    class="mr-1"
                  ></i>
                  {{ item.attendanceDone ? 'Presensi (✓)' : 'Presensi' }}
                </ElButton>
                <ElButton
                  size="small"
                  :type="item.journalDone ? 'info' : 'primary'"
                  plain
                  @click.stop="goToJournal(item.id)"
                >
                  <i
                    :class="item.journalDone ? 'ri-checkbox-circle-line' : 'ri-book-read-line'"
                    class="mr-1"
                  ></i>
                  {{ item.journalDone ? 'Jurnal (✓)' : 'Jurnal' }}
                </ElButton>
                <ElButton size="small" type="primary" plain @click.stop="openSessionDetail(item)">
                  Detail Sesi <i class="ri-arrow-right-line ml-1"></i>
                </ElButton>
              </div>
            </div>
          </div>
        </div>

        <!-- VIEW 3: TIMETABLE MATRIX GRID -->
        <div v-else-if="activeViewMode === 'GRID'" class="space-y-4">
          <div class="overflow-x-auto">
            <table
              class="w-full border-collapse border border-gray-200 dark:border-gray-800 text-xs"
            >
              <thead>
                <tr class="bg-gray-100 dark:bg-gray-800/80 text-gray-700 dark:text-gray-200">
                  <th
                    class="border border-gray-200 dark:border-gray-800 p-2.5 w-24 text-center font-bold"
                  >
                    Jam Ke / Waktu
                  </th>
                  <th
                    v-for="d in ALL_DAYS"
                    :key="d"
                    class="border border-gray-200 dark:border-gray-800 p-2.5 text-center font-bold"
                    :class="
                      todayDayName === d
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                        : ''
                    "
                  >
                    {{ d }}
                    <span v-if="todayDayName === d" class="block text-[10px] font-normal"
                      >(Hari Ini)</span
                    >
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="period in PERIOD_ROWS"
                  :key="period.period"
                  class="hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
                >
                  <td
                    class="border border-gray-200 dark:border-gray-800 p-2 text-center font-mono bg-gray-50 dark:bg-gray-900/40"
                  >
                    <div class="font-bold">Ke-{{ period.period }}</div>
                    <div class="text-[10px] text-gray-400">{{ period.time }}</div>
                  </td>

                  <td
                    v-for="d in ALL_DAYS"
                    :key="d"
                    class="border border-gray-200 dark:border-gray-800 p-1.5 align-top min-w-[140px]"
                  >
                    <div
                      v-for="item in getSchedulesForGridCell(d, period.period)"
                      :key="item.id"
                      class="p-2 rounded border bg-white dark:bg-gray-800 shadow-xs cursor-pointer hover:border-emerald-500 transition-colors"
                      :class="
                        item.timingStatus === 'ONGOING'
                          ? 'border-emerald-500 bg-emerald-50/30'
                          : 'border-gray-200 dark:border-gray-700'
                      "
                      @click="openSessionDetail(item)"
                    >
                      <div class="font-bold text-gray-900 dark:text-gray-100 truncate text-[11px]">
                        {{ item.className }}
                      </div>
                      <div
                        class="text-emerald-600 dark:text-emerald-400 truncate text-[11px] font-medium"
                      >
                        {{ item.subjectName }}
                      </div>
                      <div class="text-[10px] text-gray-400 truncate mt-0.5">
                        {{ item.roomCode }} &bull; Jam {{ item.periodStart }}-{{ item.periodEnd }}
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- Detail Sesi Mengajar Dialog -->
    <ElDialog
      v-model="detailModalVisible"
      title="Detail Sesi Jadwal Pembelajaran"
      width="560px"
      destroy-on-close
    >
      <div v-if="selectedSession" class="space-y-4">
        <!-- Banner Header -->
        <div
          class="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-xl border border-gray-100 dark:border-gray-800"
        >
          <div class="flex items-center justify-between">
            <span class="px-2.5 py-1 text-xs font-bold rounded bg-emerald-600 text-white">
              {{ selectedSession.dayOfWeek }}
            </span>
            <span class="font-mono text-sm font-semibold text-gray-700 dark:text-gray-300">
              {{ selectedSession.timeStart }} – {{ selectedSession.timeEnd }} WIB
            </span>
          </div>
          <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100 mt-2">
            {{ selectedSession.subjectName }}
          </h2>
          <p class="text-xs text-gray-500 mt-0.5">
            {{ selectedSession.majorName }} ({{ selectedSession.majorCode }})
          </p>
        </div>

        <!-- Detail Attribute List -->
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div
            class="bg-gray-50/70 dark:bg-gray-900/40 p-3 rounded-lg border border-gray-100 dark:border-gray-800"
          >
            <div class="text-xs text-gray-400 font-medium">Kelas / Rombel</div>
            <div class="font-bold text-gray-900 dark:text-gray-100 mt-0.5">
              {{ selectedSession.className }}
            </div>
            <div class="text-[11px] text-gray-500"
              >Tingkat {{ selectedSession.classLevel }} &bull; Rombel
              {{ selectedSession.rombel }}</div
            >
          </div>

          <div
            class="bg-gray-50/70 dark:bg-gray-900/40 p-3 rounded-lg border border-gray-100 dark:border-gray-800"
          >
            <div class="text-xs text-gray-400 font-medium">Ruang Belajar</div>
            <div class="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {{ selectedSession.roomName }}
            </div>
            <div class="text-[11px] text-gray-500"
              >Kode: {{ selectedSession.roomCode }} ({{ selectedSession.roomType }})</div
            >
          </div>

          <div
            class="bg-gray-50/70 dark:bg-gray-900/40 p-3 rounded-lg border border-gray-100 dark:border-gray-800"
          >
            <div class="text-xs text-gray-400 font-medium">Periode Pembelajaran</div>
            <div class="font-bold text-gray-900 dark:text-gray-100 mt-0.5">
              Jam ke-{{ selectedSession.periodStart }} s.d {{ selectedSession.periodEnd }}
            </div>
            <div class="text-[11px] text-gray-500"
              >Beban: {{ selectedSession.totalPeriods }} Jam Pelajaran (JP) Block Teaching</div
            >
          </div>

          <div
            class="bg-gray-50/70 dark:bg-gray-900/40 p-3 rounded-lg border border-gray-100 dark:border-gray-800"
          >
            <div class="text-xs text-gray-400 font-medium">Kode SK Penugasan</div>
            <div class="font-bold font-mono text-gray-900 dark:text-gray-100 mt-0.5">
              {{ selectedSession.teacherAssignmentCode }}
            </div>
            <div class="text-[11px] text-gray-500"
              >Kategori: {{ selectedSession.subjectCategory || 'Umum / Kejuruan' }}</div
            >
          </div>

          <div
            class="bg-gray-50/70 dark:bg-gray-900/40 p-3 rounded-lg border border-gray-100 dark:border-gray-800 col-span-2"
          >
            <div class="text-xs text-gray-400 font-medium">Guru Pengampu & Tahun Pelajaran</div>
            <div class="font-bold text-gray-900 dark:text-gray-100 mt-0.5">
              {{ selectedSession.teacherName }}
            </div>
            <div class="text-[11px] text-gray-500 mt-0.5">
              Tahun Pelajaran: {{ selectedSession.academicYearName }} &bull; Semester:
              {{ selectedSession.semester }} &bull; Status: {{ selectedSession.status }}
            </div>
          </div>

          <!-- Workflow Status Badges -->
          <div
            class="bg-gray-50/70 dark:bg-gray-900/40 p-3.5 rounded-lg border border-gray-100 dark:border-gray-800 col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div class="space-y-1">
              <div class="text-xs text-gray-400 font-medium"
                >Status Administrasi Pembelajaran Hari Ini</div
              >
              <div class="flex items-center gap-2 text-xs font-bold">
                <span
                  class="px-2 py-0.5 rounded-full"
                  :class="
                    selectedSession.attendanceDone
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  "
                >
                  <i
                    :class="
                      selectedSession.attendanceDone ? 'ri-checkbox-circle-line' : 'ri-time-line'
                    "
                  ></i>
                  Presensi: {{ selectedSession.attendanceDone ? 'Sudah Selesai' : 'Belum Diisi' }}
                </span>
                <span
                  class="px-2 py-0.5 rounded-full"
                  :class="
                    selectedSession.journalDone
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  "
                >
                  <i
                    :class="
                      selectedSession.journalDone ? 'ri-checkbox-circle-line' : 'ri-time-line'
                    "
                  ></i>
                  Jurnal: {{ selectedSession.journalDone ? 'Sudah Selesai' : 'Belum Diisi' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex flex-col sm:flex-row items-center justify-between gap-2">
          <div class="flex items-center gap-2 w-full sm:w-auto">
            <ElButton
              type="success"
              class="flex-1 sm:flex-none"
              @click="goToAttendance(selectedSession?.id)"
            >
              <i class="ri-user-follow-line mr-1"></i>
              {{ selectedSession?.attendanceDone ? 'Lihat / Edit Presensi' : 'Mulai Presensi' }}
            </ElButton>
            <ElButton
              type="primary"
              class="flex-1 sm:flex-none"
              @click="goToJournal(selectedSession?.id)"
            >
              <i class="ri-book-read-line mr-1"></i>
              {{ selectedSession?.journalDone ? 'Lihat / Edit Jurnal' : 'Buka Jurnal' }}
            </ElButton>
          </div>
          <ElButton @click="detailModalVisible = false">Tutup</ElButton>
        </div>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, onUnmounted, computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { ElButton, ElDialog } from 'element-plus'
  import { authService } from '@/core/services/auth'
  import {
    scheduleService,
    getTodayDayOfWeek,
    type TeacherScheduleData,
    type TeacherResolvedScheduleItem
  } from '@/core/services/master/ScheduleService'
  import type { DayOfWeek } from '@/core/types'

  defineOptions({ name: 'TeacherSchedule' })

  const router = useRouter()
  const loading = ref(true)
  const errorMessage = ref('')
  const teacherName = ref('')
  const academicYearName = ref('')
  const semesterName = ref('')

  const activeViewMode = ref<'WEEKLY' | 'TODAY' | 'GRID'>('WEEKLY')
  const selectedDayFilter = ref<string>('ALL')
  const scheduleData = ref<TeacherScheduleData | null>(null)

  const detailModalVisible = ref(false)
  const selectedSession = ref<TeacherResolvedScheduleItem | null>(null)

  // Ticking real-time clock for live timers
  const currentTime = ref(new Date())
  let clockInterval: any = null

  const ALL_DAYS: DayOfWeek[] = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU']

  const PERIOD_ROWS = [
    { period: 1, time: '07:00 - 07:45' },
    { period: 2, time: '07:45 - 08:30' },
    { period: 3, time: '08:30 - 09:15' },
    { period: 4, time: '09:30 - 10:15' },
    { period: 5, time: '10:15 - 11:00' },
    { period: 6, time: '11:00 - 11:45' },
    { period: 7, time: '12:30 - 13:15' },
    { period: 8, time: '13:15 - 14:00' },
    { period: 9, time: '14:00 - 14:45' },
    { period: 10, time: '14:45 - 15:30' }
  ]

  const todayDayName = computed(() => {
    return getTodayDayOfWeek()
  })

  const totalWeeklyHours = computed(() => {
    if (!scheduleData.value) return 0
    return scheduleData.value.schedules.reduce((acc, curr) => acc + curr.totalPeriods, 0)
  })

  const dailyProductiveRate = computed(() => {
    const hours = scheduleData.value?.todaySummary.totalHours || 0
    if (hours === 0) return 0
    return Math.min(100, Math.round((hours / 8) * 100))
  })

  const parseTimeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 0
    const [h, m] = timeStr.split(':').map(Number)
    return (h || 0) * 60 + (m || 0)
  }

  const getSessionLiveTimer = (item: TeacherResolvedScheduleItem) => {
    const now = currentTime.value
    const curSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()

    const startMin = parseTimeToMinutes(item.timeStart)
    const endMin = parseTimeToMinutes(item.timeEnd)
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

      return {
        status: 'ONGOING' as const,
        elapsedFormatted: formatSec(elapsedSec),
        remainingFormatted: formatSec(remainingSec),
        percent: Math.min(100, Math.max(0, Math.round((elapsedSec / totalSec) * 100)))
      }
    } else if (startSec > curSec) {
      const waitSec = startSec - curSec
      return {
        status: 'UPCOMING' as const,
        waitFormatted: formatSec(waitSec)
      }
    } else {
      return {
        status: 'COMPLETED' as const
      }
    }
  }

  const dayFilterOptions = computed(() => {
    const totalCount = scheduleData.value?.schedules.length || 0
    const opts = [{ label: 'Semua Hari', value: 'ALL', count: totalCount }]
    ALL_DAYS.forEach((d) => {
      const count = scheduleData.value?.weeklySchedules[d]?.length || 0
      opts.push({ label: d, value: d, count })
    })
    return opts
  })

  const filteredDaysWithSchedules = computed(() => {
    if (!scheduleData.value) return []
    const targetDays =
      selectedDayFilter.value === 'ALL' ? ALL_DAYS : [selectedDayFilter.value as DayOfWeek]

    return targetDays.map((d) => ({
      day: d,
      schedules: scheduleData.value?.weeklySchedules[d] || []
    }))
  })

  const loadScheduleData = async () => {
    loading.value = true
    errorMessage.value = ''

    try {
      const session = authService.getCurrentSession()
      if (!session || session.role !== 'GURU' || !session.teacherId) {
        errorMessage.value =
          'Akses ditolak. Sesi Guru tidak valid atau akun belum terhubung dengan data Guru.'
        return
      }

      teacherName.value = session.teacherName || session.username

      const result = await scheduleService.getTeacherSchedule(session.teacherId)
      if (!result.academicYear) {
        errorMessage.value = 'Tahun pelajaran aktif belum tersedia. Silakan hubungi administrator.'
        return
      }

      scheduleData.value = result
      if (result.teacher) {
        teacherName.value = result.teacher.name
      }
      academicYearName.value = result.academicYear.name
      semesterName.value = result.academicYear.semester
    } catch (err) {
      console.error('[TeacherSchedule] Error loading schedule:', err)
      errorMessage.value = 'Terjadi kesalahan saat memuat data jadwal mengajar.'
    } finally {
      loading.value = false
    }
  }

  const getSchedulesForGridCell = (day: DayOfWeek, period: number) => {
    if (!scheduleData.value) return []
    const daySchedules = scheduleData.value.weeklySchedules[day] || []
    return daySchedules.filter((s) => s.periodStart === period)
  }

  const openSessionDetail = (item: TeacherResolvedScheduleItem) => {
    selectedSession.value = item
    detailModalVisible.value = true
  }

  const goToAttendance = (scheduleId?: string) => {
    if (!scheduleId) return
    router.push({
      path: '/teacher/attendance',
      query: { scheduleId }
    })
  }

  const goToJournal = (scheduleId?: string) => {
    if (!scheduleId) return
    router.push({
      path: '/teacher/journal',
      query: { scheduleId }
    })
  }

  const goToDashboard = () => {
    router.push('/teacher/dashboard')
  }

  onMounted(() => {
    loadScheduleData()
    clockInterval = setInterval(() => {
      currentTime.value = new Date()
    }, 1000)
  })

  onUnmounted(() => {
    if (clockInterval) clearInterval(clockInterval)
  })
</script>
