
# Strategi: Lovable Cloud (dev) → Supabase Eksternal (prod)

Tujuan: mempercepat iterasi Phase 2 (Auth + RBAC) dengan Lovable Cloud yang otomatis provisioning, lalu pindah ke project Supabase eksternal Anda (`pkxnbazymwetrtckgikg`) saat siap rilis.

---

## Bagian A — Aktifkan Lovable Cloud (sekarang)

1. **Enable Lovable Cloud** via tool `supabase--enable`.
   - Otomatis buat project Supabase baru khusus dev + inject `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` baru ke `.env`.
   - Tidak menghapus kredensial eksternal Anda — kita simpan dulu di file lain (lihat langkah 2).

2. **Backup kredensial eksternal** ke `.env.external` (tidak dipakai runtime, hanya arsip):
   ```
   EXTERNAL_SUPABASE_URL=https://pkxnbazymwetrtckgikg.supabase.co
   EXTERNAL_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOi...Dx1fU
   ```
   Ini supaya nanti tinggal copy-paste balik.

3. **Jalankan migration Phase 2** (`db/phase2_auth_rbac.sql`) di Lovable Cloud.
   - Karena Cloud terintegrasi, saya bisa jalankan SQL otomatis lewat tool migration (tidak perlu paste manual).
   - Skema: `app_role` enum, `profiles`, `user_roles`, `has_role`, `get_user_roles`, trigger auto-create profile + default role `viewer`, RLS policies, semua GRANT.

4. **Seed admin pertama** — setelah Anda signup via `/auth`, saya siapkan tombol/SQL snippet untuk promote akun pertama jadi `admin`.

5. **Kode aplikasi tidak berubah.** `src/integrations/supabase/client.ts` sudah baca `import.meta.env.VITE_SUPABASE_*` — otomatis pakai kredensial Cloud yang baru.

---

## Bagian B — Selama development

- Semua signup, login, role assignment, dan data uji hidup di Lovable Cloud.
- Bebas reset/rebuild skema kapan saja tanpa mengganggu project eksternal.
- Lanjut Phase 3+ (Tasks, Petugas, Laporan) di atas Cloud.

---

## Bagian C — Migrasi balik ke Supabase eksternal (saat siap production)

Ketika Anda bilang "siap pindah ke eksternal", saya akan:

1. **Export skema + data dari Lovable Cloud**
   - Skema: kumpulkan semua migration SQL yang sudah dijalankan → 1 file `db/production_schema.sql`.
   - Data (opsional): export tabel `profiles`, `user_roles`, dsb. lewat SQL Editor / `pg_dump`.

2. **Apply ke project Supabase eksternal Anda**
   - Anda paste `db/production_schema.sql` di SQL Editor project `pkxnbazymwetrtckgikg`.
   - (Opsional) restore data seed.

3. **Swap kredensial di `.env`**
   ```
   VITE_SUPABASE_URL=https://pkxnbazymwetrtckgikg.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOi...Dx1fU   # dari .env.external
   ```
   Hapus/comment variabel Cloud.

4. **Disable Lovable Cloud** (opsional) supaya tidak ada dua backend aktif.

5. **Set Site URL** di Supabase Dashboard eksternal → URL published Lovable Anda.

6. **Test end-to-end**: signup baru, login, cek role guard `/dashboard`.

---

## Yang berubah / tidak berubah

| Area | Bagian A (Cloud) | Bagian C (Eksternal) |
| --- | --- | --- |
| `.env` VITE_SUPABASE_* | Cloud otomatis inject | Manual swap balik |
| `client.ts` | Tidak berubah | Tidak berubah |
| Skema DB | Auto-migrate | Paste SQL manual |
| Auth flow / RBAC code | Sama | Sama |

---

## Konfirmasi sebelum saya lanjut

Kalau Anda oke, saya akan:
1. Enable Lovable Cloud
2. Backup kredensial eksternal ke `.env.external`
3. Jalankan migration Phase 2 di Cloud
4. Kasih instruksi signup + promote admin

**Catatan penting**: data yang Anda buat di Lovable Cloud selama dev **tidak otomatis** pindah ke Supabase eksternal — hanya skema. Kalau butuh migrasi data juga, sebut saat kita sampai Bagian C.

Setuju lanjut?
