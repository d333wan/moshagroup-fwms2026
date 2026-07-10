
# Phase 2 — Autentikasi & RBAC

Fokus turn ini: fondasi keamanan sebelum modul Tasks/Petugas/Laporan.
Metode login: **email + password** (Google/Apple bisa ditambah nanti — Supabase eksternal, aktifkan sendiri di dashboard).

## 1. Skema database (Supabase eksternal)

Karena project ini pakai Supabase eksternal Anda (`pkxnbazymwetrtckgikg`), saya tidak bisa menjalankan migration otomatis. Saya akan menyiapkan **file SQL** siap-paste yang berisi:

- `enum app_role`: `admin`, `manager`, `petugas`, `viewer`
- Tabel `public.profiles` — 1:1 ke `auth.users`
  - kolom: `id (uuid PK, FK auth.users on delete cascade)`, `full_name`, `phone`, `avatar_url`, `created_at`, `updated_at`
  - RLS: user baca/update profil sendiri; admin baca semua
- Tabel `public.user_roles` — banyak peran per user
  - kolom: `id`, `user_id`, `role app_role`, unique `(user_id, role)`
  - RLS: user baca peran sendiri; hanya admin insert/update/delete
- Function `public.has_role(_user_id uuid, _role app_role)` — `security definer`, dipakai semua policy (hindari rekursi RLS)
- Function `public.get_user_roles(_user_id uuid)` — kembalikan array peran
- Trigger `on_auth_user_created` → auto-insert row `profiles` + default role `viewer` untuk user baru
- Trigger `handle_updated_at` untuk kolom `updated_at`
- Semua `GRANT` yang perlu (`authenticated`, `service_role`)

Anda tinggal paste 1x di **Supabase Dashboard → SQL Editor**. Saya sertakan tombol/link + instruksi di chat.

## 2. Klien & tipe

- Regenerate `src/integrations/supabase/types.ts` (saya buatkan versi manual berdasarkan skema di atas — bisa Anda replace via `supabase gen types` kalau mau)
- Update `src/integrations/supabase/client.ts` supaya typed: `SupabaseClient<Database>`

## 3. Halaman auth (publik)

- `src/routes/auth.tsx` — tab **Sign In** & **Sign Up**
  - Sign up: email, password, full_name → `supabase.auth.signUp({ emailRedirectTo: window.location.origin })`
  - Sign in: email + password
  - Link "Lupa password?" → panggil `resetPasswordForEmail` dengan `redirectTo: origin + '/reset-password'`
  - Redirect ke `search.redirect ?? '/dashboard'` setelah berhasil
  - Kalau sudah login → auto redirect keluar dari `/auth`
- `src/routes/reset-password.tsx` — publik, form password baru, panggil `supabase.auth.updateUser({ password })`

## 4. Auth context & guard

- `src/hooks/use-auth.tsx` — `AuthProvider` + `useAuth()`
  - State: `user`, `session`, `roles: app_role[]`, `loading`
  - Pakai `onAuthStateChange` (filter `SIGNED_IN`/`SIGNED_OUT`/`USER_UPDATED`) + initial `getSession`
  - Load roles via `get_user_roles` RPC saat session berubah
  - Helper: `hasRole(role)`, `hasAnyRole(roles[])`, `isAdmin`, `isManager`, `isPetugas`
  - `signOut()` → cancel queries, clear cache, `supabase.auth.signOut()`, navigate ke `/auth`
- Mount `AuthProvider` di `__root.tsx` (di dalam `QueryClientProvider`)
- Root: pasang **satu** listener `onAuthStateChange` → `router.invalidate()` + `queryClient.invalidateQueries()` (skip pada SIGNED_OUT)

## 5. Route guard: `_authenticated` layout

- Pindah `dashboard.*` → `src/routes/_authenticated/dashboard.tsx` + `_authenticated/dashboard.index.tsx`
- Buat `src/routes/_authenticated/route.tsx`:
  - `ssr: false`
  - `beforeLoad`: cek `supabase.auth.getUser()`; kalau null → `redirect({ to: '/auth', search: { redirect: location.href } })`
  - component: `<Outlet />`
- (Opsional siap-pakai) `src/routes/_authenticated/_admin/route.tsx` — gate `hasRole('admin')` untuk section admin nanti

## 6. Header & UX

- Update `src/components/layout/app-header.tsx`:
  - Tampilkan avatar + nama user + badge peran (dari `useAuth`)
  - Dropdown: Profile, Sign out
- Update `src/layouts/public-layout.tsx` header:
  - Kalau belum login: tombol **Sign in** → `/auth`
  - Kalau sudah login: tombol **Dashboard** + avatar menu
- Landing (`index.tsx`): tombol "Masuk ke Dashboard" tetap; kalau belum login akan auto-redirect ke `/auth`

## 7. Verifikasi

- `bunx tsc --noEmit`
- Playwright screenshot: buka `/dashboard` tanpa login → harus mendarat di `/auth?redirect=...`
- (Kalau SQL sudah dijalankan) test signup + login manual via preview

---

## Detail teknis singkat

**Struktur file baru/berubah:**
```
src/
  routes/
    auth.tsx                              (new)
    reset-password.tsx                    (new)
    _authenticated/
      route.tsx                           (new, gate)
      dashboard.tsx                       (moved)
      dashboard.index.tsx                 (moved)
  hooks/
    use-auth.tsx                          (new)
  integrations/supabase/
    types.ts                              (new, manual)
    client.ts                             (typed)
  components/layout/app-header.tsx        (edit: user menu)
  layouts/public-layout.tsx               (edit: signin/dashboard cta)
  routes/__root.tsx                       (edit: AuthProvider + listener)

supabase/migrations/
  2026xxxx_phase2_auth_rbac.sql           (new, Anda paste manual)
```

**Yang TIDAK dilakukan sekarang** (masuk phase berikutnya):
- CRUD Tasks / Petugas / Laporan lapangan / GPS check-in
- Halaman admin manage users & assign roles (butuh phase 3)
- Custom email templates (Supabase default cukup dulu)
- Social login (Google/Apple) — bisa ditambah kapan saja setelah Anda enable provider di dashboard

**Yang perlu Anda lakukan** setelah saya build:
1. Paste isi `supabase/migrations/2026xxxx_phase2_auth_rbac.sql` ke SQL Editor Supabase → Run
2. Signup akun pertama, lalu jalankan `INSERT INTO user_roles (user_id, role) VALUES ('<id-anda>', 'admin');` untuk jadi admin (saya sertakan snippet-nya di chat)
3. Set **Site URL** di Supabase Auth settings ke URL preview Lovable
