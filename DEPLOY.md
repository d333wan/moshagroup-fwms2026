# Deploy FWMS ke Hosting Eksternal

Panduan deploy aplikasi FWMS (TanStack Start + Lovable Cloud/Supabase) ke hosting selain Lovable.

## Ringkasan Kredensial

| Kredensial | Tersedia? | Keperluan |
|---|---|---|
| `VITE_SUPABASE_URL` | Ya | Client-side (frontend) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Ya | Client-side (frontend, aman publik, dilindungi RLS) |
| `SUPABASE_URL` | Ya | Server functions |
| `SUPABASE_PUBLISHABLE_KEY` | Ya | Server functions (auth flow via `requireSupabaseAuth`) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Tidak** | Admin ops — tidak diberikan ke user Lovable Cloud |
| PostgreSQL connection string | **Tidak** | Password DB tidak diakses user Lovable Cloud |
| `LOVABLE_API_KEY` | Managed | Hanya jalan di runtime Lovable |

Lihat file `.env.example` untuk daftar lengkap dan nilainya.

## Batasan Arsitektur

Project ini bukan SPA frontend murni. Ia menggunakan **TanStack Start** dengan banyak `createServerFn` yang butuh runtime server. Static host (GitHub Pages, S3, Netlify tanpa functions) **tidak bisa** menjalankannya.

Fitur yang butuh server function:
- Autentikasi (`requireSupabaseAuth` middleware)
- List/CRUD tugas & laporan lapangan
- Cetak PDF laporan (`listReportsForPrint`)
- Notifikasi & admin ops

## Opsi Deploy

### 1. Vercel (rekomendasi jika ingin keluar dari Lovable)

```bash
# Install Vercel CLI
npm i -g vercel

# Build lokal untuk cek
bun install
bun run build

# Deploy
vercel --prod
```

Set semua env var (`VITE_*` dan yang tanpa prefix `VITE_`) di **Vercel dashboard → Project → Settings → Environment Variables**.

TanStack Start punya adapter Vercel bawaan — biasanya jalan out-of-the-box.

### 2. Netlify

```bash
npm i -g netlify-cli
bun run build
netlify deploy --prod
```

Set env var di **Netlify dashboard → Site settings → Environment variables**.
Butuh Netlify Functions aktif (default aktif untuk paid plan).

### 3. Cloudflare Pages / Workers

Sudah kompatibel karena Lovable juga jalan di Cloudflare Workers. Gunakan Wrangler:

```bash
bun install
bun run build
npx wrangler pages deploy dist
```

Set env var di **Cloudflare dashboard → Workers & Pages → Settings → Variables**.

### 4. VPS (Node.js)

```bash
bun install
bun run build
node .output/server/index.mjs
```

Butuh reverse proxy (Nginx/Caddy) dan process manager (PM2/systemd). Set env var lewat `.env` di server atau via systemd unit.

## Setelah Deploy

1. **Update `redirectTo` untuk auth**: pastikan URL baru ditambahkan ke daftar redirect URL yang diizinkan di backend (via Lovable Cloud → Users → Auth Settings).
2. **CORS**: Supabase mengizinkan semua origin untuk publishable key + RLS, jadi tidak perlu setting tambahan.
3. **Test fitur**: login, buat tugas, upload attachment, cetak PDF laporan.

## Jika Ingin Service Role Key & DB Access Penuh

Anda harus **migrasi backend ke akun Supabase sendiri** (bukan Lovable Cloud):

1. Buat project baru di supabase.com
2. Export SQL migration dari folder `supabase/migrations/` project ini
3. Jalankan migration di project Supabase baru
4. Copy data dari Lovable Cloud (bisa via `pg_dump` — hubungi support Lovable) ke project baru
5. Ganti semua env var di atas dengan kredensial project Supabase baru
6. Sekarang service role key & DB connection string tersedia di dashboard Supabase Anda

**Perhatian**: Setelah migrasi keluar dari Lovable Cloud, project Lovable ini tidak bisa lagi dipakai untuk edit backend (schema/migration lewat Lovable). Kembangan berikutnya harus lewat Supabase CLI / SQL editor Supabase langsung.

## FAQ

**Q: Kenapa Service Role Key tidak diberikan?**
A: Lovable Cloud menyediakan Supabase secara managed. Service role bypass RLS dan bisa dipakai untuk akses total ke semua data workspace, jadi dibatasi hanya untuk runtime internal Lovable via `@/integrations/supabase/client.server`.

**Q: Bisa akses database dari DBeaver/pgAdmin?**
A: Tidak dari Lovable Cloud. Harus migrasi ke akun Supabase sendiri dulu.

**Q: Deploy paling gampang?**
A: Klik tombol **Publish** di Lovable — otomatis dapat URL `.lovable.app` gratis + bisa tambah custom domain.
