# Build APK Android (Trusted Web Activity + Bubblewrap)

Aplikasi Android FWMS Petugas dibungkus sebagai **Trusted Web Activity (TWA)**
menggunakan [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap).
Aplikasi utama tetap PWA yang di-host di HTTPS — TWA hanya membuka domain PWA
di dalam Chrome tanpa address bar.

## Prasyarat

- Node.js 20+
- JDK 17 (Bubblewrap otomatis mengunduh jika belum tersedia)
- Domain publik dengan HTTPS (misal `https://moshagroup-fwms2026.lovable.app`)
- PWA sudah dipublikasikan (`manifest.webmanifest` valid, service worker aktif,
  ikon 192/512/maskable tersedia)

## 1. Install Bubblewrap

```bash
npm install -g @bubblewrap/cli
```

## 2. Inisialisasi proyek TWA

Dari folder kosong di luar repository web:

```bash
bubblewrap init --manifest https://<DOMAIN-FWMS>/manifest.webmanifest
```

Isi prompt sesuai konfigurasi berikut:

| Field                | Value                          |
| -------------------- | ------------------------------ |
| Application name     | `FWMS Petugas`                 |
| Short name           | `FWMS`                         |
| Application ID       | `com.moshagroup.fwms`          |
| Starting URL         | `/`                            |
| Display mode         | `standalone`                   |
| Orientation          | `portrait`                     |
| Status bar color     | `#B91C1C`                      |
| Splash color         | `#0F172A`                      |
| Signing key          | Buat baru — SIMPAN `.keystore` |

> `keystore` **jangan pernah** dicommit ke repository.

## 3. Build APK release

```bash
bubblewrap build
```

Output: `app-release-signed.apk` di folder proyek Bubblewrap.

## 4. Publish APK ke website

Salin APK yang sudah signed ke:

```
public/downloads/FWMS-Petugas-latest.apk
```

Lalu update `public/app-version.json`:

```json
{
  "versionName": "1.0.0",
  "versionCode": 1,
  "apkUrl": "/downloads/FWMS-Petugas-latest.apk",
  "releaseDate": "2026-07-10",
  "changelog": ["Initial TWA release"]
}
```

Deploy ulang website. Halaman **/download** akan otomatis menampilkan versi
terbaru.

## 5. Digital Asset Links

Ambil SHA-256 fingerprint sertifikat signing:

```bash
bubblewrap fingerprint
```

Ganti placeholder `REPLACE_WITH_SHA256_CERTIFICATE_FINGERPRINT` pada
`public/.well-known/assetlinks.json` dengan fingerprint asli, lalu deploy.

Verifikasi:

```bash
curl -I https://<DOMAIN-FWMS>/.well-known/assetlinks.json
```

Harus:

- HTTP 200
- `content-type: application/json`
- Tanpa redirect ke halaman login
- Tanpa 404

## 6. Update aplikasi

- **Perubahan konten web / bugfix UI**: cukup deploy ulang website. TWA
  otomatis memuat versi terbaru saat online — user tidak perlu update APK.
- **Perubahan package, signing key, ikon native, permission, atau
  konfigurasi TWA**: build APK baru dengan `bubblewrap update && bubblewrap build`.

## 7. Distribusi

APK signed dapat didistribusikan langsung melalui halaman `/download`
tanpa harus melalui Google Play Store. Pengguna perlu mengizinkan "Install
dari sumber tidak dikenal" di perangkat Android mereka.
