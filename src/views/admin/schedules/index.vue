<template>
  <div class="p-5 space-y-5">
    <!-- Header -->
    <div class="art-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Jadwal Pelajaran & Kalender Mengajar
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Master jadwal tatap muka mingguan dilengkapi deteksi bentrok otomatis (Guru, Ruang, dan
          Kelas).
        </p>
      </div>

      <div class="flex items-center gap-3">
        <ElButton type="primary" @click="openCreateModal">
          <i class="ri-calendar-event-line mr-1"></i> Tambah Jadwal Baru
        </ElButton>
      </div>
    </div>

    <!-- Main Table Card -->
    <div class="art-card p-6">
      <div class="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-3 max-w-2xl w-full">
          <ElSelect v-model="filterDay" placeholder="Filter Hari" class="!w-36">
            <ElOption label="Semua Hari" value="" />
            <ElOption label="Senin" value="SENIN" />
            <ElOption label="Selasa" value="SELASA" />
            <ElOption label="Rabu" value="RABU" />
            <ElOption label="Kamis" value="KAMIS" />
            <ElOption label="Jumat" value="JUMAT" />
            <ElOption label="Sabtu" value="SABTU" />
          </ElSelect>

          <ElSelect
            v-model="filterClass"
            placeholder="Pilih Kelas"
            class="!w-44"
            filterable
            clearable
          >
            <ElOption label="Semua Kelas" value="" />
            <ElOption v-for="c in classes" :key="c.id" :label="c.name" :value="c.id" />
          </ElSelect>

          <ElInput
            v-model="searchQuery"
            placeholder="Cari guru, mapel, atau ruang..."
            clearable
            prefix-icon="ri-search-line"
            class="!w-64"
          />
        </div>

        <div class="text-xs text-gray-500">
          Total:
          <span class="font-semibold text-gray-700 dark:text-gray-300">{{
            filteredSchedules.length
          }}</span>
          sesi jadwal
        </div>
      </div>

      <ElTable :data="filteredSchedules" v-loading="loading" stripe style="width: 100%">
        <ElTableColumn prop="dayOfWeek" label="Hari" width="110" align="center">
          <template #default="{ row }">
            <ElTag
              size="small"
              :type="
                row.dayOfWeek === 'SENIN'
                  ? 'primary'
                  : row.dayOfWeek === 'JUMAT'
                    ? 'success'
                    : 'info'
              "
            >
              {{ row.dayOfWeek }}
            </ElTag>
          </template>
        </ElTableColumn>

        <ElTableColumn label="Jam Ke & Waktu" width="160">
          <template #default="{ row }">
            <div class="text-xs space-y-0.5">
              <div class="font-bold text-gray-800 dark:text-gray-200">
                Jam ke-{{ row.periodStart }} s/d {{ row.periodEnd }}
              </div>
              <div class="text-gray-400 font-mono">{{ row.timeStart }} - {{ row.timeEnd }}</div>
            </div>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="className" label="Kelas Rombel" min-width="140">
          <template #default="{ row }">
            <span class="font-bold text-gray-900 dark:text-gray-100">{{ row.className }}</span>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="subjectName" label="Mata Pelajaran" min-width="220">
          <template #default="{ row }">
            <div class="font-medium text-gray-800 dark:text-gray-200">{{ row.subjectName }}</div>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="teacherName" label="Guru Pengampu" min-width="200">
          <template #default="{ row }">
            <div class="text-emerald-600 dark:text-emerald-400 font-medium">
              {{ row.teacherName }}
            </div>
          </template>
        </ElTableColumn>

        <ElTableColumn label="Ruangan" min-width="150">
          <template #default="{ row }">
            <div class="text-xs">
              <span class="font-semibold text-gray-700 dark:text-gray-300">{{ row.roomName }}</span>
              <span class="text-gray-400"> ({{ row.roomCode }})</span>
            </div>
          </template>
        </ElTableColumn>

        <ElTableColumn label="Aksi" width="160" fixed="right">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <ElButton size="small" type="primary" link @click="openEditModal(row as any)">
                Edit
              </ElButton>
              <ElButton size="small" type="danger" link @click="handleDelete(row as any)">
                Hapus
              </ElButton>
            </div>
          </template>
        </ElTableColumn>
      </ElTable>
    </div>

    <!-- Create / Edit Modal -->
    <ElDialog
      v-model="modalVisible"
      :title="isEditing ? 'Edit Jadwal Pelajaran' : 'Tambah Jadwal Pelajaran Baru'"
      width="600px"
      destroy-on-close
    >
      <ElForm
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-position="top"
        class="grid grid-cols-1 md:grid-cols-2 gap-x-4"
      >
        <ElFormItem label="Hari Belajar" prop="dayOfWeek">
          <ElSelect v-model="form.dayOfWeek" class="w-full">
            <ElOption label="Senin" value="SENIN" />
            <ElOption label="Selasa" value="SELASA" />
            <ElOption label="Rabu" value="RABU" />
            <ElOption label="Kamis" value="KAMIS" />
            <ElOption label="Jumat" value="JUMAT" />
            <ElOption label="Sabtu" value="SABTU" />
          </ElSelect>
        </ElFormItem>

        <ElFormItem label="Kelas Rombel" prop="classId">
          <ElSelect v-model="form.classId" class="w-full" placeholder="Pilih Kelas" filterable>
            <ElOption v-for="c in classes" :key="c.id" :label="c.name" :value="c.id" />
          </ElSelect>
        </ElFormItem>

        <ElFormItem label="Penugasan Guru & Mapel" prop="teacherAssignmentId" class="md:col-span-2">
          <ElSelect
            v-model="form.teacherAssignmentId"
            class="w-full"
            placeholder="Pilih Penugasan Guru & Mapel"
            filterable
          >
            <ElOption
              v-for="a in assignments"
              :key="a.id"
              :label="`${a.code} - ${a.teacherName} (${a.subjectName})`"
              :value="a.id"
            />
          </ElSelect>
        </ElFormItem>

        <ElFormItem label="Jam Ke (Mulai)" prop="periodStart">
          <ElInputNumber v-model="form.periodStart" :min="1" :max="12" class="!w-full" />
        </ElFormItem>

        <ElFormItem label="Jam Ke (Selesai)" prop="periodEnd">
          <ElInputNumber v-model="form.periodEnd" :min="1" :max="12" class="!w-full" />
        </ElFormItem>

        <ElFormItem label="Waktu Mulai" prop="timeStart">
          <ElTimePicker
            v-model="form.timeStart"
            format="HH:mm"
            value-format="HH:mm"
            placeholder="07:00"
            class="!w-full"
          />
        </ElFormItem>

        <ElFormItem label="Waktu Selesai" prop="timeEnd">
          <ElTimePicker
            v-model="form.timeEnd"
            format="HH:mm"
            value-format="HH:mm"
            placeholder="08:30"
            class="!w-full"
          />
        </ElFormItem>

        <ElFormItem label="Ruangan / Lab / Bengkel" prop="roomId" class="md:col-span-2">
          <ElSelect v-model="form.roomId" class="w-full" placeholder="Pilih Ruang" filterable>
            <ElOption
              v-for="r in rooms"
              :key="r.id"
              :label="`${r.code} - ${r.name} (${r.type})`"
              :value="r.id"
            />
          </ElSelect>
        </ElFormItem>
      </ElForm>

      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="modalVisible = false">Batal</ElButton>
          <ElButton type="primary" :loading="saving" @click="handleSave">
            {{ isEditing ? 'Simpan Perubahan' : 'Tambah Jadwal' }}
          </ElButton>
        </div>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { scheduleService, ScheduleWithDetails } from '@/core/services/master/ScheduleService'
  import {
    assignmentService,
    AssignmentWithDetails
  } from '@/core/services/master/AssignmentService'
  import { classService } from '@/core/services/master/ClassService'
  import { roomService } from '@/core/services/master/RoomService'
  import { academicService } from '@/core/services/master/AcademicService'
  import type { ClassEntity, RoomEntity, DayOfWeek } from '@/core/types'
  import type { FormInstance, FormRules } from 'element-plus'

  const schedules = ref<ScheduleWithDetails[]>([])
  const classes = ref<ClassEntity[]>([])
  const rooms = ref<RoomEntity[]>([])
  const assignments = ref<AssignmentWithDetails[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const searchQuery = ref('')
  const filterDay = ref<string>('')
  const filterClass = ref<string>('')
  const activeAcademicYearId = ref('ay_2026_2027_ganjil')

  const modalVisible = ref(false)
  const isEditing = ref(false)
  const editingId = ref('')
  const formRef = ref<FormInstance>()

  const form = ref({
    dayOfWeek: 'SENIN' as DayOfWeek,
    classId: '',
    teacherAssignmentId: '',
    periodStart: 1,
    periodEnd: 2,
    timeStart: '07:00',
    timeEnd: '08:30',
    roomId: ''
  })

  const formRules: FormRules = {
    dayOfWeek: [{ required: true, message: 'Hari belajar wajib dipilih', trigger: 'change' }],
    classId: [{ required: true, message: 'Kelas wajib dipilih', trigger: 'change' }],
    teacherAssignmentId: [
      { required: true, message: 'Penugasan guru wajib dipilih', trigger: 'change' }
    ],
    roomId: [{ required: true, message: 'Ruangan wajib dipilih', trigger: 'change' }]
  }

  const filteredSchedules = computed(() => {
    let result = schedules.value

    if (filterDay.value) {
      result = result.filter((s) => s.dayOfWeek === filterDay.value)
    }

    if (filterClass.value) {
      result = result.filter((s) => s.classId === filterClass.value)
    }

    if (searchQuery.value.trim()) {
      const q = searchQuery.value.trim().toLowerCase()
      result = result.filter(
        (s) =>
          (s.teacherName && s.teacherName.toLowerCase().includes(q)) ||
          (s.subjectName && s.subjectName.toLowerCase().includes(q)) ||
          (s.roomName && s.roomName.toLowerCase().includes(q))
      )
    }

    return result
  })

  async function loadData() {
    loading.value = true
    try {
      const [schList, clsList, rmList, asgList, activeAy] = await Promise.all([
        scheduleService.getSchedulesWithDetails(),
        classService.getAllClasses('ACTIVE'),
        roomService.getAllRooms('ACTIVE'),
        assignmentService.getAssignmentsWithDetails(),
        academicService.getActiveAcademicYear()
      ])

      schedules.value = schList
      classes.value = clsList
      rooms.value = rmList
      assignments.value = asgList
      if (activeAy) {
        activeAcademicYearId.value = activeAy.id
      }
    } catch {
      ElMessage.error('Gagal memuat data jadwal pelajaran.')
    } finally {
      loading.value = false
    }
  }

  function openCreateModal() {
    isEditing.value = false
    editingId.value = ''
    form.value = {
      dayOfWeek: 'SENIN',
      classId: classes.value.length > 0 ? classes.value[0].id : '',
      teacherAssignmentId: assignments.value.length > 0 ? assignments.value[0].id : '',
      periodStart: 1,
      periodEnd: 2,
      timeStart: '07:00',
      timeEnd: '08:30',
      roomId: rooms.value.length > 0 ? rooms.value[0].id : ''
    }
    modalVisible.value = true
  }

  function openEditModal(sch: ScheduleWithDetails) {
    isEditing.value = true
    editingId.value = sch.id
    form.value = {
      dayOfWeek: sch.dayOfWeek,
      classId: sch.classId,
      teacherAssignmentId: sch.teacherAssignmentId,
      periodStart: sch.periodStart,
      periodEnd: sch.periodEnd,
      timeStart: sch.timeStart,
      timeEnd: sch.timeEnd,
      roomId: sch.roomId
    }
    modalVisible.value = true
  }

  async function handleSave() {
    if (!formRef.value) return
    await formRef.value.validate(async (valid) => {
      if (!valid) return
      saving.value = true
      try {
        if (isEditing.value) {
          await scheduleService.updateSchedule(editingId.value, { ...form.value })
          ElMessage.success('Jadwal pelajaran berhasil diperbarui.')
        } else {
          await scheduleService.createSchedule({
            ...form.value,
            academicYearId: activeAcademicYearId.value
          })
          ElMessage.success('Jadwal pelajaran baru berhasil ditambahkan.')
        }
        modalVisible.value = false
        await loadData()
      } catch (err: any) {
        ElMessage.error(err.message || 'Gagal menyimpan jadwal pelajaran.')
      } finally {
        saving.value = false
      }
    })
  }

  async function handleDelete(sch: ScheduleWithDetails) {
    try {
      await ElMessageBox.confirm(
        `Apakah Anda yakin ingin menghapus jadwal ${sch.dayOfWeek} (${sch.className} - ${sch.subjectName})?`,
        'Konfirmasi Hapus Jadwal',
        {
          confirmButtonText: 'Ya, Hapus',
          cancelButtonText: 'Batal',
          type: 'warning'
        }
      )

      await scheduleService.deleteSchedule(sch.id)
      ElMessage.success('Jadwal pelajaran berhasil dihapus.')
      await loadData()
    } catch {
      // Cancelled
    }
  }

  onMounted(() => {
    loadData()
  })
</script>
