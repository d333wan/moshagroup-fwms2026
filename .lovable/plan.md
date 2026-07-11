# Rencana: Seed Data Demo Lengkap

Mengisi database dengan data contoh realistis agar sistem bisa langsung didemokan tanpa input manual.

## Cakupan Data

### 1. Users & Profiles (6 akun demo)
Dibuat via Supabase Auth Admin API (server function sekali-jalan), lalu profil + role otomatis lewat trigger `handle_new_user`. Password seragam: `Demo123!`.

| Email | Nama | Role | Jabatan |
|---|---|---|---|
| admin@demo.mosha.id | Budi Santoso | super_admin | Direktur Operasional |
| manager@demo.mosha.id | Siti Rahayu | manager | Manajer Lapangan |
| pemberi@demo.mosha.id | Andi Wijaya | pemberi_tugas | Koordinator Proyek |
| petugas1@demo.mosha.id | Rudi Hartono | petugas_lapangan | Teknisi Senior BTS |
| petugas2@demo.mosha.id | Dewi Lestari | petugas_lapangan | Surveyor Lapangan |
| petugas3@demo.mosha.id | Agus Prasetyo | petugas_lapangan | Teknisi Junior |

Foto avatar: 6 gambar potret profesional yang di-generate dan diunggah ke Lovable Assets, URL ditulis ke `profiles.avatar_url`.

### 2. Field Officers (3 petugas)
Lengkap dengan department, skills, base_location, status ketersediaan, no HP, employee_id.

### 3. Locations (6 lokasi, koordinat asli Indonesia)
- Kantor Pusat Mosha — Jakarta Selatan (-6.2608, 106.7811)
- Gudang Bekasi — Bekasi (-6.2383, 106.9756)
- Site BTS Sudirman — Jakarta Pusat (-6.2088, 106.8229)
- Site BTS Kelapa Gading — Jakarta Utara (-6.1588, 106.9057)
- Site BTS Bogor Kota — Bogor (-6.5950, 106.8167)
- Site BTS Bandung Dago — Bandung (-6.8862, 107.6132)

### 4. Tasks (8 tugas dengan variasi status & prioritas)
Mix status: `draft`, `assigned`, `in_progress`, `on_hold`, `completed`. Priority: low → urgent. Semua terhubung ke `location_id` + `location_text` fallback, dengan `due_date` tersebar (kemarin, hari ini, minggu ini, minggu depan). Assignment dibuat ke 3 petugas (sebagian multi-assignee).

### 5. Task Reports (5 laporan)
Untuk task yang `in_progress` & `completed`:
- 2 progress report (narasi + checklist JSON)
- 2 completion report (dengan koordinat GPS ≈ lokasi tugas)
- 1 issue report (kendala akses site)

### 6. Report Attachments (foto lapangan)
6 foto lapangan di-generate (menara BTS, panel, teknisi kerja, tanda tangan) → upload ke Supabase Storage bucket `task-reports` via `supabase--storage_upload` → insert baris `task_report_attachments` (kind: `photo` / `signature`).

### 7. Notifications (otomatis)
Terisi sendiri lewat trigger `notify_on_assignment` & `notify_on_status_change` saat tasks/assignments di-seed. Tidak perlu insert manual.

## Urutan Eksekusi

1. **Generate 6 avatar + 6 foto lapangan** via `imagegen--generate_image` → simpan sebagai Lovable Assets, dapatkan URL CDN.
2. **Server function seed** di `src/lib/seed-demo.server.ts` + route publik `/api/public/seed-demo` (dilindungi header `x-seed-token` = secret baru `DEMO_SEED_TOKEN`) yang:
   - Membuat 6 user via `supabaseAdmin.auth.admin.createUser` (idempotent: skip jika email sudah ada).
   - Update `profiles.avatar_url`, `job_title`, `employee_id`, `phone`.
   - Upsert `field_officers`.
3. **Migration SQL** (menggunakan tool migration) untuk data non-auth yang aman diinsert langsung:
   - `INSERT` locations, tasks, task_assignments, task_reports.
   - Menggunakan sub-select `(SELECT id FROM profiles WHERE ...)` untuk mapping user.
   - `ON CONFLICT DO NOTHING` agar idempotent.
4. **Upload foto ke Storage** via `supabase--storage_upload` ke `task-reports/{task_id}/{report_id}/{filename}` + insert `task_report_attachments`.
5. **Tombol "Seed Demo Data"** di halaman `/dashboard` khusus super_admin (kanan atas) — memanggil server fn `runDemoSeed` untuk menjalankan ulang seed kapan saja.
6. **Smoke test**: login sebagai `admin@demo.mosha.id`, cek dashboard, officers, locations, tasks, satu task detail dengan galeri foto & peta.

## Yang TIDAK Diubah
- Skema database (semua tabel sudah ada dari Phase 4–6).
- RLS & policies.
- Trigger notifikasi (dipakai untuk mengisi notifications otomatis).
- Design system / route existing.

## Catatan Teknis
- Semua kredensial demo di-print di response akhir agar user bisa langsung login.
- Foto dihosting via Lovable Assets (avatar) & Supabase Storage bucket `task-reports` (lampiran laporan, private, akses via signed URL — sesuai flow existing).
- Koordinat GPS realistis Jabodetabek + Bandung agar peta Leaflet menampilkan pin masuk akal.
- Tidak menyentuh production data user — semua email berdomain `@demo.mosha.id` sehingga mudah dihapus nanti.

## Konfirmasi
Setuju jalankan seed di atas? Jika ada preferensi (mis. lokasi kota lain, jumlah tugas berbeda, mau tambah petugas ke-4, atau password default lain) sebutkan sebelum eksekusi.
