# Build APK Android (Capacitor)

Aplikasi web ini juga dikemas sebagai APK Android via Capacitor. Build native harus dilakukan di komputer lokal Anda (bukan di preview Lovable), karena butuh Android Studio + JDK.

## Prasyarat
- Node.js 20+
- Android Studio (JDK 17 sudah otomatis)
- Bun (atau npm/yarn)

## Langkah pertama (sekali saja)
```bash
bun install
bunx cap add android
```

## Setiap kali update web app
```bash
bun run build
bunx cap sync android
bunx cap open android
```
Lalu di Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
APK ada di `android/app/build/outputs/apk/debug/app-debug.apk`.

## Konfigurasi
- App ID: `com.moshagroup.fwms`
- Nama: `FWMS Petugas`
- Ubah di `capacitor.config.ts` bila perlu.

## Permission Android (auto oleh plugin)
- `CAMERA` — ambil foto
- `ACCESS_FINE_LOCATION` — koordinat GPS untuk watermark

## URL Backend
App terhubung ke Supabase yang sama seperti web. Tidak perlu konfigurasi tambahan.
