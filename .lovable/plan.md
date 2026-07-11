# Modul Laporan Petugas Lapangan

Menambah modul laporan lapangan sesuai spesifikasi PDF, terpisah dari `task_reports` yang lama supaya fitur existing tetap jalan.

## Skema Database (migrasi baru)

Tabel baru di schema `public` + GRANT + RLS:

- `field_reports` — kolom sesuai PDF (report_number auto `LAP-YYYYMMDD-####`, task_id, officer_id, gps + accuracy + distance_from_target + gps_source `device|external`, progress_percent, work_status enum `not_started|arrived|in_progress|delayed|completed`, work_description, has_obstacle, obstacle_description, assistance_needed, vehicle_type, license_plate, status enum `draft|submitted|needs_revision|approved|rejected`, submitted_at, verified_at, verified_by, timestamps).
- `field_report_photos` — photo_type enum (`officer_selfie|location|location_direction|physical_condition|gps_evidence|vehicle|obstacle`), storage_path, capture_source (`camera|gallery|upload`), caption, lat/lon, captured_at.
- `field_report_comments` — sender_id, message.
- Extend `tasks` dengan kolom opsional: `supervisor_company_name`, `supervisor_person_name`, `supervisor_job_title`, `supervisor_phone`, `supervisor_whatsapp`, `emergency_contact_primary`, `emergency_contact_secondary`, `vehicle_type`, `license_plate`, `photo_direction_mode` (`none|single|four_way`), `radius_meters` (default 100).

RLS:
- Petugas: SELECT/INSERT/UPDATE hanya `officer_id = auth.uid()` dan hanya untuk task yang di-assign; UPDATE dibatasi status `draft|needs_revision`.
- Admin/super_admin: full akses via `is_admin_tier()`.
- Manager: SELECT semua (supervisor view via assignment).
- Comments: sender = auth.uid() untuk INSERT; SELECT untuk pihak yang terlibat.

Storage bucket baru `field-reports` (private) + policy signed URL only.

Trigger: notifikasi ke admin saat `status` berubah ke `submitted`, `has_obstacle=true`, atau di luar radius; notifikasi ke petugas saat verified/rejected/needs_revision.

## Server Functions (`src/lib/field-reports.functions.ts`)

- `createFieldReport` — buat/upsert draft.
- `submitFieldReport` — validasi wajib (selfie + foto lokasi + GPS), set status `submitted`.
- `listMyFieldReports`, `getFieldReport`, `listFieldReportsAdmin` (filter status/tanggal/kendala/radius).
- `verifyFieldReport` (approve/reject/needs_revision + komentar).
- `addFieldReportComment`.
- `getSignedPhotoUrl`.
- `updateTaskSupervisorInfo` (dipakai form penugasan).

## Routes UI

Petugas (`/_authenticated/dashboard/`):
- `field-reports.index.tsx` → `/petugas/laporan-lapangan` mirror di sidebar: kartu ringkas (Tugas Aktif, Laporan Hari Ini, Draft, Menunggu Sinkron, Perlu Revisi, Disetujui) + list kartu laporan + tombol besar **Buat Laporan**.
- `field-reports.new.tsx` (dari task) — wizard 3 langkah:
  1. Kehadiran & Lokasi (GPS device / external + foto GPS + selfie, tampilkan jarak & status radius).
  2. Dokumentasi (selfie, foto lokasi/4-arah sesuai mode task, ≤4 foto kondisi, watermark otomatis via komponen `watermark-camera`).
  3. Progres & Kendala (status, %, uraian ≤500 char, toggle kendala + bantuan). Tombol Simpan Draft & Kirim.
- `field-reports.$reportId.tsx` — detail + komentar + tombol lanjutkan bila draft/perlu revisi.

Admin (`dashboard.field-reports.*`):
- `dashboard.field-reports.index.tsx` → `/dashboard/laporan-petugas` tabel + filter + KPI cards.
- `dashboard.field-reports.$reportId.tsx` — detail lengkap, foto (signed URL), komentar, aksi Approve/Reject/Revisi, Export PDF (route `print`).
- `dashboard.field-reports.print.$reportId.tsx` — PDF ringkas via `print-shell` + QR verifikasi (link ke detail).

Sidebar (`src/components/layout/app-sidebar.tsx`):
- Menu Petugas: "Laporan Lapangan" (`/dashboard/field-reports`).
- Menu Admin: "Laporan Petugas" (`/dashboard/field-reports/admin`) di grup existing.

Form penugasan (`dashboard.tasks.new.tsx` + `edit`): tambah section opsional Supervisor Perusahaan, Kontak Darurat, Kendaraan, Mode Foto Arah, Radius.

## Fitur Pendukung

- Offline: gunakan IndexedDB (via `idb-keyval`) menyimpan draft + blob foto; auto-sync saat `online` event; tandai `Menunggu Sinkronisasi` di list.
- Watermark: reuse `WatermarkCamera` komponen, extend untuk sertakan nomor tugas & nama lokasi.
- Kompresi foto: `browser-image-compression` (sudah ringan) sebelum upload.
- Realtime: subscribe channel `field_reports` untuk badge notifikasi.
- QR pada PDF: pakai `qrcode` lib server-side → data URL.

## Kriteria Selesai

Sesuai checklist §14 PDF: TypeScript pass, form 3-step jalan di mobile, GPS device+external, foto wajib tervalidasi, admin bisa verifikasi, notifikasi realtime, offline draft tidak duplikat.

## Catatan

Implementasi cukup besar (~15 file baru + migrasi). Saya akan build bertahap: (1) migrasi + server fn, (2) UI petugas + wizard, (3) UI admin + PDF, (4) offline + realtime polish. Bila mau dipangkas (mis. skip offline / skip 4-arah / skip QR), sebutkan sebelum saya mulai.
