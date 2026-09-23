-- =========================================================================
-- GURU OFFLINE — SMK NU UNGARAN
-- Production Cloud Architecture: Canonical PostgreSQL Schema & RLS Policies
-- Source of Truth: Supabase PostgreSQL (Tahap Phase 0 Full Forward Migration)
-- =========================================================================

-- Enable UUID & Crypto Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. SCHOOL IDENTITY
CREATE TABLE IF NOT EXISTS public.schools (
    id TEXT PRIMARY KEY,
    npsn TEXT NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    principal_name TEXT NOT NULL,
    principal_nip TEXT,
    wks1_name TEXT NOT NULL,
    wks1_nip TEXT,
    logo_url TEXT,
    contact TEXT NOT NULL,
    iso_doc_code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ACADEMIC YEARS
CREATE TABLE IF NOT EXISTS public.academic_years (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    semester TEXT NOT NULL CHECK (semester IN ('GANJIL', 'GENAP')),
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    locked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ACADEMIC PERIODS (Semester, Monthly, Submission Windows)
CREATE TABLE IF NOT EXISTS public.academic_periods (
    id TEXT PRIMARY KEY,
    academic_year_id TEXT NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    period_type TEXT NOT NULL CHECK (period_type IN ('SEMESTER', 'MONTHLY', 'MID_SEMESTER', 'FINAL_SUBMISSION')),
    semester TEXT NOT NULL CHECK (semester IN ('GANJIL', 'GENAP')),
    month INTEGER CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    submission_deadline TIMESTAMPTZ NOT NULL,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    locked_at TIMESTAMPTZ,
    locked_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TEACHERS (Logical identity & Profile)
CREATE TABLE IF NOT EXISTS public.teachers (
    id TEXT PRIMARY KEY,
    auth_user_id UUID UNIQUE,
    nip TEXT,
    nuptk TEXT,
    nik TEXT,
    name TEXT NOT NULL,
    title TEXT,
    gender TEXT CHECK (gender IN ('L', 'P')),
    birth_place TEXT,
    birth_date DATE,
    employment_status TEXT,
    position TEXT,
    rank_group TEXT,
    education TEXT,
    study_program TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    photo TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. MAJORS
CREATE TABLE IF NOT EXISTS public.majors (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. CLASSES
CREATE TABLE IF NOT EXISTS public.classes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('X', 'XI', 'XII')),
    rombel TEXT NOT NULL,
    academic_year_id TEXT NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    major_id TEXT NOT NULL REFERENCES public.majors(id) ON DELETE CASCADE,
    homeroom_teacher_id TEXT REFERENCES public.teachers(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. SUBJECTS
CREATE TABLE IF NOT EXISTS public.subjects (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT CHECK (category IN ('UMUM', 'KEJURUAN', 'MUATAN_LOKAL', 'PILIHAN')),
    default_kkm NUMERIC(5, 2) DEFAULT 75.00,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. ROOMS
CREATE TABLE IF NOT EXISTS public.rooms (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('THEORY', 'LAB', 'WORKSHOP', 'OTHER')),
    capacity INTEGER DEFAULT 36,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. STUDENTS
CREATE TABLE IF NOT EXISTS public.students (
    id TEXT PRIMARY KEY,
    nis TEXT NOT NULL UNIQUE,
    nisn TEXT,
    name TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('L', 'P')),
    birth_place TEXT,
    birth_date DATE,
    class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'MUTATION', 'GRADUATED', 'INACTIVE')),
    parent_phone TEXT,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. TEACHER ASSIGNMENTS (Teacher Workspace Scope)
CREATE TABLE IF NOT EXISTS public.teacher_assignments (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    hours INTEGER NOT NULL DEFAULT 2,
    academic_year_id TEXT NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    semester TEXT NOT NULL CHECK (semester IN ('GANJIL', 'GENAP')),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. SCHEDULES
CREATE TABLE IF NOT EXISTS public.schedules (
    id TEXT PRIMARY KEY,
    academic_year_id TEXT NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    teacher_assignment_id TEXT NOT NULL REFERENCES public.teacher_assignments(id) ON DELETE CASCADE,
    day_of_week TEXT NOT NULL CHECK (day_of_week IN ('SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU')),
    period_start INTEGER NOT NULL,
    period_end INTEGER NOT NULL,
    time_start TEXT NOT NULL,
    time_end TEXT NOT NULL,
    room_id TEXT NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. ATTENDANCES (Presensi Siswa)
CREATE TABLE IF NOT EXISTS public.attendances (
    id TEXT PRIMARY KEY,
    schedule_id TEXT NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
    class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    teacher_assignment_id TEXT NOT NULL REFERENCES public.teacher_assignments(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    academic_year_id TEXT NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    semester TEXT NOT NULL CHECK (semester IN ('GANJIL', 'GENAP')),
    records JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by TEXT NOT NULL,
    updated_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(schedule_id, date)
);

-- 13. JOURNALS (Agenda & Jurnal Mengajar)
CREATE TABLE IF NOT EXISTS public.journals (
    id TEXT PRIMARY KEY,
    schedule_id TEXT NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
    class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    teacher_assignment_id TEXT NOT NULL REFERENCES public.teacher_assignments(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time_slot TEXT NOT NULL,
    academic_year_id TEXT NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    semester TEXT NOT NULL CHECK (semester IN ('GANJIL', 'GENAP')),
    topic TEXT NOT NULL,
    activity_summary TEXT NOT NULL,
    student_attendance_summary JSONB,
    notes TEXT,
    created_by TEXT NOT NULL,
    updated_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. ASSESSMENTS & SCORES (Penilaian Siswa)
CREATE TABLE IF NOT EXISTS public.assessments (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    teacher_assignment_id TEXT NOT NULL REFERENCES public.teacher_assignments(id) ON DELETE CASCADE,
    academic_year_id TEXT NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    semester TEXT NOT NULL CHECK (semester IN ('GANJIL', 'GENAP')),
    type TEXT NOT NULL CHECK (type IN ('HARIAN', 'TUGAS', 'KUIS', 'STS', 'SAS', 'SIKAP', 'KETERAMPILAN')),
    title TEXT NOT NULL,
    date DATE,
    max_score NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
    scores JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by TEXT NOT NULL,
    updated_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. DISCIPLINE NOTES
CREATE TABLE IF NOT EXISTS public.discipline_notes (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    teacher_id TEXT NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('VIOLATION', 'PRAISE', 'NOTE')),
    point INTEGER DEFAULT 0,
    description TEXT NOT NULL,
    followup TEXT,
    created_by TEXT NOT NULL,
    updated_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS public.announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('URGENT', 'NORMAL')),
    target_role TEXT NOT NULL DEFAULT 'ALL' CHECK (target_role IN ('ALL', 'ADMIN', 'GURU')),
    published BOOLEAN NOT NULL DEFAULT TRUE,
    pinned BOOLEAN NOT NULL DEFAULT FALSE,
    author_id TEXT NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. SCHOOL AGENDAS
CREATE TABLE IF NOT EXISTS public.school_agendas (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    location TEXT,
    category TEXT NOT NULL CHECK (category IN ('AKADEMIK', 'UJIAN', 'LIBUR', 'RAPAT', 'KEGIATAN')),
    target_role TEXT NOT NULL DEFAULT 'ALL' CHECK (target_role IN ('ALL', 'GURU', 'ADMIN')),
    is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. TEACHER SUBMISSIONS (Workflow: DRAFT -> READY_TO_SUBMIT -> SUBMITTED -> REVIEW -> APPROVED/RETURNED -> LOCKED)
CREATE TABLE IF NOT EXISTS public.submissions (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    academic_period_id TEXT NOT NULL REFERENCES public.academic_periods(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'READY_TO_SUBMIT', 'SUBMITTED', 'REVIEW', 'RETURNED', 'APPROVED', 'LOCKED')),
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    reviewed_by TEXT,
    feedback TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    completeness JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(teacher_id, academic_period_id)
);

-- 19. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor TEXT NOT NULL,
    role TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    affected_ids JSONB,
    operation TEXT NOT NULL,
    result TEXT NOT NULL,
    source TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.majors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discipline_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_agendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is ADMIN
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.jwt() ->> 'role' = 'ADMIN' OR auth.jwt() -> 'app_metadata' ->> 'role' = 'ADMIN');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Master data: Public read for authenticated users, Admin write
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY['schools', 'academic_years', 'academic_periods', 'majors', 'classes', 'subjects', 'rooms', 'students', 'teacher_assignments', 'schedules', 'announcements', 'school_agendas'])
    LOOP
        EXECUTE format('CREATE POLICY "Auth read for %s" ON public.%s FOR SELECT TO authenticated USING (true);', tbl, tbl);
        EXECUTE format('CREATE POLICY "Admin write for %s" ON public.%s FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());', tbl, tbl);
    END LOOP;
END $$;

-- Teacher Workspace isolation for Operational Data (attendances, journals, assessments, submissions)
CREATE POLICY "Teacher can view assigned attendances" ON public.attendances
    FOR SELECT TO authenticated
    USING (public.is_admin() OR teacher_assignment_id IN (
        SELECT id FROM public.teacher_assignments WHERE teacher_id = auth.uid()::text OR teacher_id = (SELECT id FROM public.teachers WHERE auth_user_id = auth.uid())
    ));

CREATE POLICY "Teacher can manage assigned attendances" ON public.attendances
    FOR ALL TO authenticated
    USING (public.is_admin() OR teacher_assignment_id IN (
        SELECT id FROM public.teacher_assignments WHERE teacher_id = auth.uid()::text OR teacher_id = (SELECT id FROM public.teachers WHERE auth_user_id = auth.uid())
    ));

CREATE POLICY "Teacher can view assigned journals" ON public.journals
    FOR SELECT TO authenticated
    USING (public.is_admin() OR teacher_assignment_id IN (
        SELECT id FROM public.teacher_assignments WHERE teacher_id = auth.uid()::text OR teacher_id = (SELECT id FROM public.teachers WHERE auth_user_id = auth.uid())
    ));

CREATE POLICY "Teacher can manage assigned journals" ON public.journals
    FOR ALL TO authenticated
    USING (public.is_admin() OR teacher_assignment_id IN (
        SELECT id FROM public.teacher_assignments WHERE teacher_id = auth.uid()::text OR teacher_id = (SELECT id FROM public.teachers WHERE auth_user_id = auth.uid())
    ));

CREATE POLICY "Teacher can view assigned assessments" ON public.assessments
    FOR SELECT TO authenticated
    USING (public.is_admin() OR teacher_assignment_id IN (
        SELECT id FROM public.teacher_assignments WHERE teacher_id = auth.uid()::text OR teacher_id = (SELECT id FROM public.teachers WHERE auth_user_id = auth.uid())
    ));

CREATE POLICY "Teacher can manage assigned assessments" ON public.assessments
    FOR ALL TO authenticated
    USING (public.is_admin() OR teacher_assignment_id IN (
        SELECT id FROM public.teacher_assignments WHERE teacher_id = auth.uid()::text OR teacher_id = (SELECT id FROM public.teachers WHERE auth_user_id = auth.uid())
    ));

CREATE POLICY "Teacher can view own submissions" ON public.submissions
    FOR SELECT TO authenticated
    USING (public.is_admin() OR teacher_id = auth.uid()::text OR teacher_id = (SELECT id FROM public.teachers WHERE auth_user_id = auth.uid()));

CREATE POLICY "Teacher can insert/update own draft submissions" ON public.submissions
    FOR ALL TO authenticated
    USING (public.is_admin() OR teacher_id = auth.uid()::text OR teacher_id = (SELECT id FROM public.teachers WHERE auth_user_id = auth.uid()));

-- Realtime enablement
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.school_agendas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.submissions;
