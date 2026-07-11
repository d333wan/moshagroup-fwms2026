# Proposal FWMS (PDF)

Membuat dokumen proposal profesional untuk sistem **Field Work Management System (FWMS)** dalam format PDF, lengkap dengan screenshot dashboard dan penjelasan fungsi tiap menu.

## Output
- File: `/mnt/documents/Proposal-FWMS.pdf` (bisa diunduh user)
- Ukuran: A4, ~10-14 halaman
- Bahasa: Indonesia
- Branding: MoshaGroup / FWMS (logo & warna dari `src/lib/company.ts`)

## Struktur Dokumen

1. **Cover** — Logo MoshaGroup, judul "Proposal Field Work Management System", tanggal, versi
2. **Ringkasan Eksekutif** — Tujuan, manfaat, ROI singkat
3. **Latar Belakang & Tujuan** — Masalah pengelolaan petugas lapangan, solusi FWMS
4. **Arsitektur Sistem** — TanStack Start + Lovable Cloud (Supabase), PWA/TWA Android, deploy Cloudflare
5. **Peran Pengguna** — Super Admin, Admin, Manager, Petugas Lapangan (dari `src/lib/roles.ts`)
6. **Fitur & Fungsi Tiap Menu** (bagian utama, dengan screenshot):
   - Dashboard Utama — ringkasan tugas aktif, statistik
   - Dashboard Petugas (My Work) — tugas harian petugas
   - Penugasan (Tasks) — CRUD tugas, prioritas, jatuh tempo, assign petugas
   - Petugas Lapangan (Officers) — manajemen data petugas
   - Lokasi — titik lokasi kerja + peta
   - Cetak Laporan — filter & export PDF laporan lapangan
   - Notifikasi — notifikasi real-time
   - Pengguna (Super Admin) — manajemen akun & role
7. **Alur Kerja Operasional** — Diagram: Admin buat tugas → Petugas terima → Laporan lapangan (foto+GPS+checklist) → Approval → Cetak PDF
8. **Keamanan & Data** — Auth, RLS, role-based access, watermark camera, GPS tagging
9. **Deployment & Hosting** — Opsi Lovable Cloud vs hosting eksternal (ringkasan dari DEPLOY.md)
10. **Roadmap Pengembangan** — Fase yang sudah selesai (v0.4.0 · Phase 6) & rencana lanjutan
11. **Penutup & Kontak**

## Cara Pembuatan (Teknis)

1. Jalankan preview di localhost via Playwright headless dengan session Supabase yang sudah di-inject
2. Ambil screenshot tiap route dashboard utama pada viewport 1280×1800:
   - `/dashboard`, `/dashboard/tasks`, `/dashboard/tasks/new`, `/dashboard/officers`, `/dashboard/locations`, `/dashboard/my-work`, `/dashboard/reports/print`, `/dashboard/notifications`, `/dashboard/users`
3. Simpan screenshot ke `/tmp/proposal/shots/`
4. Generate PDF pakai **reportlab** (Python) dengan:
   - Cover berisi logo (`src/assets/moshagroup-logo.png`)
   - Palet warna sesuai brand
   - Setiap menu = 1 halaman: judul menu, screenshot (fit width), tabel fungsi (fitur | deskripsi | role yang bisa akses)
5. QA: convert PDF ke image tiap halaman → inspect visual → perbaiki bila ada overflow/clipping → re-render
6. Sajikan sebagai `<presentation-artifact>` agar user bisa langsung unduh

## Catatan
- Kalau session auth **tidak** ter-inject saat capture, sebagian screenshot dashboard tidak bisa diambil dan akan diganti mockup teks/placeholder. Kalau itu terjadi saya akan minta login preview dulu sebelum lanjut.
- Isi teks proposal ditulis netral & bisa dipakai untuk pitching ke internal MoshaGroup atau klien.

Setuju dijalankan? Kalau ada bagian yang mau ditambah/diubah (mis. tambahkan harga, timeline implementasi, SLA), sebut sebelum saya mulai.
