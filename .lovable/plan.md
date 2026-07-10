
# Phase 3 — Modul Penugasan (Tasks)

Melanjutkan roadmap setelah Phase 2 (Auth + RBAC + manajemen pengguna). Fokus fase ini: CRUD tugas, penugasan ke petugas lapangan, prioritas & status, dengan RLS ketat sesuai peran.

## Ruang Lingkup

**Termasuk:**
- Tabel `tasks` + `task_assignments` (satu tugas → banyak petugas) + `task_status_history` (audit).
- Halaman `/dashboard/tasks` (list + filter + search), `/dashboard/tasks/new`, `/dashboard/tasks/$taskId` (detail + edit + assign + ubah status).
- Menu sidebar "Penugasan" diaktifkan (saat ini masih placeholder → `/dashboard`).
- Widget dashboard "Tugas Aktif" & "Aktivitas Terbaru" membaca data nyata.

**Tidak termasuk (fase berikutnya):**
- Master data Petugas & Lokasi (Phase 4)
- Laporan lapangan / foto / tanda tangan (Phase 5)
- Notifikasi realtime & mobile offline sync

## Skema Database

```text
enum task_priority   : low | medium | high | urgent
enum task_status     : draft | assigned | in_progress | on_hold | completed | cancelled

tasks
  id uuid pk
  title text not null
  description text
  priority task_priority default 'medium'
  status   task_status   default 'draft'
  due_date timestamptz
  location_text text            -- alamat bebas (Phase 4 pindah ke tabel locations)
  created_by uuid → auth.users
  created_at / updated_at

task_assignments
  id uuid pk
  task_id uuid → tasks (cascade)
  assignee_id uuid → auth.users
  assigned_by uuid → auth.users
  assigned_at timestamptz
  unique (task_id, assignee_id)

task_status_history
  id, task_id, from_status, to_status, changed_by, changed_at, note
```

**RLS (ringkas):**
- `super_admin` / `admin` / `manager`: full read; create/update/delete pada tugas yang mereka buat atau semua (manager+).
- `petugas_lapangan`: read & update **hanya** tugas di mana `assignee_id = auth.uid()`; boleh ubah status tapi tidak boleh menghapus atau reassign.
- `guest`: read-only pada tugas mereka sendiri (assignee).
- Semua write memakai fungsi `has_role()` yang sudah ada.

GRANT lengkap ke `authenticated` + `service_role` untuk ketiga tabel (sesuai aturan public schema).

Trigger: `updated_at` auto-update, dan trigger insert ke `task_status_history` setiap kali `status` berubah.

## Server Functions (`src/lib/tasks.functions.ts`)

Semua pakai `requireSupabaseAuth` middleware; RLS jadi lapis kedua.

- `listTasks({ status?, priority?, assigneeId?, search? })`
- `getTask({ id })` → task + assignments + history
- `createTask(input)` (admin/manager/super_admin)
- `updateTask({ id, patch })` (creator atau manager+)
- `deleteTask({ id })` (manager+)
- `assignTask({ task_id, assignee_ids })` — replace assignments (manager+)
- `changeTaskStatus({ id, to_status, note? })` (assignee atau manager+)

## Routing & UI

Route baru (TanStack file-based):

- `src/routes/_authenticated/dashboard.tasks.tsx` — layout `<Outlet/>`
- `src/routes/_authenticated/dashboard.tasks.index.tsx` — daftar
- `src/routes/_authenticated/dashboard.tasks.new.tsx` — form buat
- `src/routes/_authenticated/dashboard.tasks.$taskId.tsx` — detail + edit + assign + ubah status

Pola data: loader panggil `context.queryClient.ensureQueryData(...)`, komponen `useSuspenseQuery` — sesuai konvensi project.

Komponen baru (kecil, semantic tokens saja):
- `TasksTable` (dengan filter chips: status, prioritas, assignee)
- `TaskStatusBadge`, `TaskPriorityBadge`
- `AssigneePicker` (multi-select petugas dari daftar user `petugas_lapangan`)
- `StatusChangeDialog` (pilih status baru + catatan)

Update:
- `app-sidebar.tsx` — item "Penugasan" arahkan ke `/dashboard/tasks` (semua role); tampilkan hanya bila punya minimal role `guest`.
- `dashboard.index.tsx` — kartu statistik "Tugas Aktif" & "Aktivitas Terbaru" fetch dari `listTasks`.

## Design & UX

Menggunakan token yang sudah ada (`bg-card`, `border`, `text-foreground`, `text-muted-foreground`). Tidak ada warna hardcoded. Badge status/prioritas pakai `variant` shadcn + token accent/destructive.

## Deliverables per Turn

1. Migration SQL (enums, tabel, RLS, GRANT, trigger).
2. Server functions + query options module.
3. Route files + komponen tabel/form/dialog.
4. Sidebar & dashboard home update.
5. Smoke test manual: super_admin buat task → assign ke user petugas → login petugas → ubah status → verifikasi history.

## Konfirmasi

Setuju scope di atas? Kalau ada tambahan (mis. field checklist item, attachment, atau tag), sebutkan sebelum saya mulai — akan lebih mahal jika ditambahkan setelah tabel jadi.
