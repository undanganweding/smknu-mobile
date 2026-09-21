# PHASE B — GENERATOR LEMBAR RAPOR SISWA (KURIKULUM MERDEKA) SPECIFICATION

## 1. FORMULA DECISION — LOCKED

Status: **PHASE B PROJECT RULE — LOCKED**

### Official Source Disclaimer

No authoritative school formula was found in the available project sources. The above formula is therefore explicitly locked as a Phase B project rule, not represented as an official SMK NU Ungaran regulation.

### Exact Calculation Equations

- **Complete Case (Formatif + STS + SAS):** $$\text{NA} = (\text{Formatif} \times 0.50) + (\text{STS} \times 0.25) + (\text{SAS} \times 0.25)$$
- **Partial Case A (Formatif + STS only):** $$\text{NA} = (\text{Formatif} \times 0.60) + (\text{STS} \times 0.40)$$
- **Partial Case B (Formatif + SAS only):** $$\text{NA} = (\text{Formatif} \times 0.60) + (\text{SAS} \times 0.40)$$
- **Sumatif Only Case (STS + SAS only):** $$\text{NA} = \frac{\text{STS} + \text{SAS}}{2}$$
- **Formatif Only Case:** $$\text{NA} = \text{Formatif Average}$$
- **STS Only Case:** $$\text{NA} = \text{STS}$$
- **SAS Only Case:** $$\text{NA} = \text{SAS}$$
- **No Assessment Data:** $$\text{NA} = \text{null}$$

### Assessment Category Classifications

- **Formatif Components:** `HARIAN`, `TUGAS`, `KUIS`, `SIKAP`, `KETERAMPILAN`
- **Sumatif Components:** `STS` (Sumatif Tengah Semester), `SAS` (Sumatif Akhir Semester)

---

## 2. AUTHORIZATION SPECIFICATION

- **ADMIN:** Global school-wide access across all academic years, classes, and students.
- **WALI KELAS:** Access to their homeroom class and all students enrolled in that class.
- **GURU PENGAJAR:** Access to students belonging to classes they teach based on active teaching assignments and schedules. Unauthorized cross-class requests are rejected with an explicit `AuthorizationError`.
