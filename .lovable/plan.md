# Rencana Lanjutan — Phase 4, 5, 6

Melanjutkan seluruh fase berikutnya sekaligus, dengan tambahan field **no. handphone** dan **jabatan** untuk Petugas Lapangan.

## Phase 4 — Master Data: Petugas Lapangan & Lokasi

### Skema Database

**Perluasan `profiles`** (untuk semua user, terutama petugas):
- `phone` sudah ada → tetap dipakai sebagai no. handphone
- **baru:** `job_title text` (jabatan, mis. "Teknisi Senior", "Surveyor")
- **baru:** `employee_id text unique` (NIP/ID pegawai, opsional)

**Tabel baru `field_officers`** (data operasional khusus petugas):
- `user_id uuid pk → profiles.id`
- `department text` (unit/divisi)
- `skills text[]` (keahlian: instalasi, survei, dll.)
- `base_location_id uuid → locations.id` (home base)
- `status enum: available | on_duty | off_duty | leave`
- `notes text`

**Tabel baru `locations`**:
- `id, name, address, city, province, postal_code`
- `latitude numeric, longitude numeric` (opsional)
- `category text` (kantor, gudang, site, dll.)
- `is_active boolean`

**Update `tasks`:**
- `location_id uuid → locations.id` (nullable, coexist dengan `location_text` lama)

**RLS:**
- `locations`: read semua authenticated; write manager+
- `field_officers`: read manager+ & pemilik record; write manager+; petugas boleh update `status` sendiri via server fn

GRANT lengkap `authenticated` + `service_role` (kecuali anon).

### Server Functions & UI
- `src/lib/officers.functions.ts` — list, get, upsert, updateStatus
- `src/lib/locations.functions.ts` — CRUD
- Route baru: `/dashboard/officers`, `/dashboard/officers/$id`, `/dashboard/locations`, `/dashboard/locations/$id`
- Sidebar: aktifkan "Petugas Lapangan" & "Lokasi" (manager+)
- Form profil petugas: input jabatan + no. HP + departemen + keahlian
- `AssigneePicker` di modul Tasks diperkaya menampilkan jabatan & status ketersediaan
- Task form: dropdown lokasi menggantikan input teks bebas (teks tetap didukung sebagai fallback)

## Phase 5 — Laporan Lapangan (Field Reports)

### Skema
**`task_reports`**:
- `task_id, reported_by, report_type enum(progress|completion|issue)`
- `narrative text, checklist jsonb`
- `latitude, longitude, reported_at`

**`task_report_attachments`**:
- `report_id, storage_path, file_name, mime_type, size_bytes, kind enum(photo|signature|document)`

**Storage bucket** `task-reports` (private) — path `{task_id}/{report_id}/{filename}`.

**RLS:** assignee tugas boleh insert; manager+ read semua; assignee read report tugas sendiri.

### UI
- Route `/dashboard/tasks/$taskId/reports/new` — form: narasi, checklist, upload foto (multi), tanda tangan (canvas) → PNG upload
- Detail tugas menampilkan timeline laporan + galeri foto (signed URL)
- Server fn `createReport`, `listReports`, `getSignedAttachmentUrl`

## Phase 6 — Notifikasi & Dashboard Realtime

### Skema
**`notifications`**:
- `user_id, type, title, body, link, is_read, created_at`

**Trigger** pada `task_assignments` INSERT & `task_status_history` INSERT → sisipkan baris notifikasi ke assignee/creator.

### UI
- Bell icon di header: badge unread count, dropdown daftar notifikasi terbaru
- Realtime subscribe `notifications` via `supabase.channel` untuk user aktif
- Route `/dashboard/notifications` — full list, mark all read
- Dashboard home: statistik direfresh saat ada perubahan tasks (realtime channel)

## Urutan Eksekusi (turn-by-turn)

1. Migration Phase 4 (kolom profiles + locations + field_officers + tasks.location_id + RLS + GRANT + triggers)
2. Server fns + route + UI Phase 4 (officers & locations)
3. Migration Phase 5 (task_reports + attachments + bucket + RLS)
4. Server fns + UI Phase 5 (form laporan + galeri + signature pad)
5. Migration Phase 6 (notifications + trigger)
6. UI Phase 6 (bell, realtime, halaman notifikasi)
7. Smoke test end-to-end

## Yang TIDAK diubah
- Struktur auth, RBAC, `has_role`, layout `_authenticated`
- Tabel `tasks`, `task_assignments`, `task_status_history` (kolom lama tetap)
- Design system / token warna hasil refinement sebelumnya

## Konfirmasi
Setuju eksekusi semua 3 fase berurutan di atas? Jika ada field tambahan untuk petugas (mis. tanggal masuk, foto KTP, sertifikasi) sebutkan sekarang — lebih murah ditambah di migration awal daripada nanti.
