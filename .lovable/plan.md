# Cetak Laporan PDF (Filter Jenis via Checkbox)

Menambahkan fitur cetak PDF komprehensif untuk laporan lapangan. User bisa memilih jenis laporan yang ingin dimasukkan (Progres, Selesai, Masalah) via checkbox, dan hasil cetakannya menampilkan seluruh detail — narasi, checklist, koordinat GPS, foto lampiran, waktu, pelapor, dan info tugas.

## Cakupan

Dua titik akses cetak:

1. **Per tugas** — di halaman `dashboard/tasks/$taskId`, tombol "Cetak PDF" pada kartu "Laporan Lapangan". Cetak semua laporan pada tugas tsb.
2. **Global / rekap** — halaman baru `dashboard/reports/print` yang bisa memfilter berdasarkan rentang tanggal, tugas, dan jenis laporan; cetak banyak laporan sekaligus.

## Alur UI

Dialog "Cetak Laporan" berisi:

- **Jenis Laporan** (checkbox, semua tercentang default):
  - [x] Progres
  - [x] Selesai
  - [x] Masalah / Kendala
- **Sertakan Foto Lampiran** (checkbox, default on)
- **Sertakan Checklist** (checkbox, default on)
- **Sertakan Koordinat GPS** (checkbox, default on)
- Tombol: Batal · **Cetak PDF**

Setelah klik Cetak PDF: buka tab baru berisi HTML laporan yang siap-print (auto `window.print()`), atau generate PDF client-side.

## Isi PDF

Header: logo Mosha + `COMPANY_ADDRESS`, judul "Laporan Lapangan", tanggal cetak, nama pencetak.

Untuk setiap tugas → setiap laporan yang lolos filter:
- Judul tugas, status, prioritas, jatuh tempo, lokasi (nama + alamat + koordinat).
- Petugas ditugaskan.
- Kartu laporan: jenis (badge), waktu, pelapor, koordinat GPS.
- Narasi lengkap.
- Checklist (kotak ✓/✗ + label).
- Grid foto lampiran (dengan signed URL, dimuat sebagai `<img>`).
- Halaman baru per tugas (page-break) supaya rapi.

Footer setiap halaman: nama perusahaan + nomor halaman.

## Teknis

**Library**: pakai `jspdf` + `jspdf-autotable` untuk PDF client-side, atau strategi lebih sederhana — render HTML print-friendly di route baru `/dashboard/reports/print/preview` lalu panggil `window.print()` (browser export ke PDF). Strategi print-HTML dipilih karena:
- Tidak butuh dependency baru.
- Foto lampiran mudah ditampilkan dengan `<img src={signedUrl}>`.
- CSS `@media print` mengatur page-break, hide sidebar/header.

**File yang ditambah/diubah:**

1. `src/lib/reports.functions.ts` — tambah `listReportsForPrint({ task_ids?, from?, to?, types? })` server function: return laporan + lampiran + signed URL (batch) + info tugas & lokasi & petugas. Sudah pakai `requireSupabaseAuth`, RLS otomatis filter.

2. `src/components/reports/print-reports-dialog.tsx` — dialog checkbox jenis + opsi, tombol Cetak PDF. Props: `taskId?` (jika dari halaman tugas) atau `filters` global. Setelah submit → `navigate({ to: '/dashboard/reports/print/preview', search: {...} })` di tab baru.

3. `src/routes/_authenticated/dashboard.reports.print.preview.tsx` — route baru, layout khusus print (tanpa `DashboardLayout`). Baca `validateSearch` (types[], taskIds[], from, to, includePhotos, includeChecklist, includeGps), panggil `listReportsForPrint`, render HTML print-friendly dengan `@media print` CSS. `useEffect` panggil `window.print()` setelah gambar termuat.

4. `src/routes/_authenticated/dashboard.tasks.$taskId.tsx` — tambah tombol "Cetak PDF" di header kartu Laporan Lapangan yang membuka `PrintReportsDialog` dengan `taskId` terkunci.

5. `src/routes/_authenticated/dashboard.reports.index.tsx` (baru) — halaman "Cetak Laporan" di sidebar: form filter (rentang tanggal, jenis checkbox, opsi konten), preview jumlah laporan cocok, tombol Cetak PDF.

6. `src/components/layout/app-sidebar.tsx` — tambah menu "Cetak Laporan" (icon `Printer`) untuk admin/manager.

## Styling Print

```css
@media print {
  @page { size: A4; margin: 15mm; }
  .no-print { display: none !important; }
  .report-card { break-inside: avoid; }
  .task-block { break-before: page; }
  .task-block:first-child { break-before: auto; }
}
```

## Verifikasi

- Build & typecheck lulus.
- Login `admin@demo.mosha.id`, buka detail tugas, klik Cetak PDF, centang hanya "Progres" → PDF hanya berisi laporan progres, foto & GPS tampil.
- Menu global: filter rentang tanggal → cetak, tiap tugas mulai halaman baru.
