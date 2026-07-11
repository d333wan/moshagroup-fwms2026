## Deploy ke Hosting Eksternal — Kondisi & Batasan

Sebelum menyiapkan kredensial, penting Anda tahu batasan platform berikut supaya keputusan deploy tepat.

### 1. Kredensial yang TERSEDIA (bisa dipakai di hosting eksternal)

Nilai ini sudah ada di project (file `.env`) dan aman dibagikan ke frontend:

- `VITE_SUPABASE_URL` — URL backend
- `VITE_SUPABASE_PUBLISHABLE_KEY` — publishable/anon key (aman untuk client-side, dilindungi RLS)
- `VITE_SUPABASE_PROJECT_ID` — project ref

Cukup untuk aplikasi frontend (React) yang deploy di Vercel, Netlify, Cloudflare Pages, dsb.

### 2. Kredensial yang TIDAK TERSEDIA di Lovable Cloud

Ini batasan platform — bukan bisa diambil manual:

- **Service Role Key** — TIDAK diberikan ke user Lovable Cloud. Hanya bisa dipakai di dalam server function yang berjalan di runtime Lovable (via `@/integrations/supabase/client.server`). Tidak bisa diekspor keluar.
- **Connection String PostgreSQL langsung** (host, port, user, password DB) — password database tidak diakses oleh user Lovable Cloud, jadi tool eksternal (DBeaver, pgAdmin) juga tidak bisa konek langsung.

Alternatif jika Anda benar-benar butuh service role atau akses DB langsung: **connect ke akun Supabase sendiri** (bukan Lovable Cloud). Ini artinya migrasi backend keluar dari Lovable Cloud.

### 3. Peringatan Arsitektur — App Ini Bukan Frontend Murni

Project FWMS Anda pakai **TanStack Start** dengan banyak `createServerFn` (server functions) yang berjalan di Cloudflare Workers milik Lovable. Contoh: `src/lib/reports.functions.ts`, `tasks.functions.ts`, auth middleware, dll.

Jika deploy ke hosting biasa (Vercel/Netlify/VPS), server function ini **harus di-porting** ke runtime target:
- **Vercel** — bisa jalan dengan adapter TanStack Start untuk Vercel Edge/Node
- **Netlify** — perlu adapter Netlify
- **VPS/Node server** — perlu build Node adapter
- **Static host (GitHub Pages)** — TIDAK bisa, karena server function butuh runtime

Environment variable server-side (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SESSION_SECRET`) juga harus diset ulang di dashboard hosting tujuan.

### 4. Rekomendasi

Silakan pilih salah satu jalur:

**Jalur A — Tetap di Lovable (paling mudah)**  
Klik **Publish** di editor. Dapat URL `.lovable.app` gratis, bisa tambah custom domain. Semua server function jalan otomatis. Tidak perlu urus kredensial sama sekali.

**Jalur B — Deploy frontend saja ke hosting lain, backend tetap Lovable Cloud**  
Cocok jika Anda hanya butuh custom hosting untuk UI. Saya siapkan file `.env.example` dan `DEPLOY.md` berisi:
- Daftar env var yang harus diset di hosting tujuan (URL + publishable key)
- Perintah build (`bun run build`)
- Catatan: fitur yang butuh server function (auth server-side, admin ops, PDF report) tetap harus diakses via URL Lovable — atau di-porting.

**Jalur C — Migrasi penuh keluar dari Lovable Cloud**  
Anda buat akun Supabase sendiri, jalankan ulang semua migration SQL, lalu ganti kredensial. Setelah itu service role key & connection string DB tersedia penuh dari dashboard Supabase Anda sendiri. Butuh effort lebih besar dan keluar dari Lovable Cloud (tidak bisa balik untuk project ini).

---

**Mohon pilih jalur yang Anda inginkan (A / B / C), atau sebutkan hosting spesifik yang Anda tuju (Vercel, Netlify, VPS, cPanel, dll)** — nanti saya buatkan file konfigurasi + instruksi yang sesuai.