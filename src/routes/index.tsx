import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ClipboardList,
  MapPin,
  ShieldCheck,
  Smartphone,
  RefreshCw,
  BarChart3,
  ArrowRight,
  Download,
} from "lucide-react";
import { PublicLayout } from "@/layouts/public-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import androidPhone from "@/assets/android-phone-mockup.png";
import heroBg from "@/assets/hero-bg.jpg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FWMS - PT. MOSHA SERI NUSANTARA" },
      {
        name: "description",
        content:
          "Kelola penugasan, pelaporan lapangan, monitoring progres, dan sinkronisasi online/offline dalam satu sistem terpadu.",
      },
      {
        property: "og:title",
        content: "FWMS - PT. MOSHA SERI NUSANTARA",
      },
      {
        property: "og:description",
        content:
          "Kelola penugasan, pelaporan lapangan, monitoring progres, dan sinkronisasi online/offline dalam satu sistem terpadu.",
      },
      { property: "og:url", content: "https://moshagroup-fwms2026.lovable.app/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://moshagroup-fwms2026.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "FWMS — Field Work Management System",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Android, Web",
          description:
            "Sistem terpadu untuk penugasan, pelaporan, monitoring, dan sinkronisasi pekerjaan lapangan.",
          publisher: {
            "@type": "Organization",
            name: "PT. MOSHA SERI NUSANTARA",
            url: "https://moshagroup-fwms2026.lovable.app",
          },
          offers: { "@type": "Offer", price: "0", priceCurrency: "IDR" },
        }),
      },
    ],
  }),
  component: LandingPage,
});

const features = [
  {
    icon: ClipboardList,
    title: "Penugasan Terpusat",
    desc: "Buat, tetapkan, dan pantau tugas dengan prioritas dan alur approval.",
  },
  {
    icon: MapPin,
    title: "Monitoring Lokasi",
    desc: "Riwayat GPS petugas dan check-in real-time di lapangan.",
  },
  {
    icon: Smartphone,
    title: "Aplikasi Petugas",
    desc: "Update progres, foto, dan tanda tangan langsung dari perangkat mobile.",
  },
  {
    icon: RefreshCw,
    title: "Offline & Auto Sync",
    desc: "Bekerja tanpa internet, sinkronisasi otomatis saat online kembali.",
  },
  {
    icon: BarChart3,
    title: "Dashboard & Laporan",
    desc: "Statistik lengkap dan laporan cetak untuk setiap peran.",
  },
  {
    icon: ShieldCheck,
    title: "RBAC & Audit",
    desc: "Kontrol akses berbasis peran dan audit log menyeluruh.",
  },
];

function LandingPage() {
  const [open, setOpen] = useState(false);

  return (
    <PublicLayout>
      <Dialog open={open} onOpenChange={setOpen}>
        <section
          className="relative overflow-hidden border-b border-border"
          style={{
            backgroundImage: `linear-gradient(rgba(8, 15, 40, 0.78), rgba(8, 15, 40, 0.9)), url(${heroBg.url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="relative mx-auto max-w-3xl px-4 pb-20 pt-20 text-center sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-medium text-white backdrop-blur sm:px-4 sm:py-1.5 sm:text-base">
                PT. MOSHA SERI NUSANTARA
              </span>
              <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Field Work Management System
              </h1>
              <p className="mt-4 text-base text-slate-200 sm:text-lg">
                Sistem terpadu untuk mengelola penugasan, pelaporan pekerjaan
                lapangan, monitoring progres, serta sinkronisasi data secara
                online dan offline.
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Button asChild size="lg">
                  <Link to="/dashboard">
                    Masuk ke Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <DialogTrigger asChild>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download APK Android
                  </Button>
                </DialogTrigger>
              </div>
            </div>
          </div>
        </section>

        <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0 sm:rounded-2xl">
          <div className="grid gap-0 sm:grid-cols-2">
            <div className="p-6 sm:p-8">
              <DialogHeader className="text-left">
                <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full border border-border bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                  <Smartphone className="h-3.5 w-3.5" />
                  Android Tersedia
                </span>
                <DialogTitle className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Aplikasi Petugas Lapangan untuk Android
                </DialogTitle>
                <DialogDescription className="mt-2 text-base text-muted-foreground">
                  Foto ber-watermark otomatis (tanggal, jam, koordinat GPS),
                  update progres, dan lapor tugas langsung dari lapangan.
                  Bekerja online atau offline.
                </DialogDescription>
              </DialogHeader>
              <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                  Kamera + galeri dengan watermark otomatis
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                  Status ketersediaan &amp; peta lokasi tugas
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                  Notifikasi real-time penugasan baru
                </li>
              </ul>
              <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <Button asChild size="lg">
                  <a href="/downloads/FWMS-Petugas-latest.apk" download>
                    <Download className="mr-2 h-4 w-4" />
                    Download APK Android
                  </a>
                </Button>
                <span className="text-xs text-muted-foreground">
                  Android 8.0+ · <Link to="/download" className="underline">Halaman download lengkap</Link>
                </span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Setelah mengunduh, izinkan &ldquo;Install dari sumber tidak
                dikenal&rdquo; pada perangkat Anda.
              </p>
            </div>
            <div className="flex items-center justify-center bg-muted/50 p-6 sm:p-8">
              <img
                src={androidPhone}
                alt="Preview aplikasi FWMS Petugas di Android"
                width={900}
                height={1200}
                loading="lazy"
                className="max-h-[360px] w-auto drop-shadow-2xl sm:max-h-[420px]"
              />
            </div>
          </div>
        </DialogContent>

        <section
          id="modul"
          className="mx-auto max-w-7xl px-4 pb-16 pt-20 sm:px-6 lg:px-8"
        >
          <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Fitur Utama
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card
                key={f.title}
                className="rounded-2xl border-feature/30 bg-feature text-feature-foreground"
              >
                <CardContent className="p-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold text-white">
                    {f.title}
                  </h3>
                  <p className="mt-1 text-sm text-white/90">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </Dialog>
    </PublicLayout>
  );
}
