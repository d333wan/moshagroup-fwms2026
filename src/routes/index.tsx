import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ClipboardList,
  MapPin,
  ShieldCheck,
  Smartphone,
  RefreshCw,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { PublicLayout } from "@/layouts/public-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FWMS — Field Work Management System" },
      {
        name: "description",
        content:
          "Kelola penugasan, pelaporan lapangan, monitoring progres, dan sinkronisasi online/offline dalam satu sistem terpadu.",
      },
      { property: "og:title", content: "FWMS — Field Work Management System" },
      {
        property: "og:description",
        content:
          "Sistem terpadu untuk penugasan, pelaporan, monitoring, dan sinkronisasi pekerjaan lapangan.",
      },
      { property: "og:type", content: "website" },
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
  return (
    <PublicLayout>
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center rounded-full border border-border bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
            Enterprise · Phase 1 Foundation
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Field Work Management System
          </h1>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Sistem terpadu untuk mengelola penugasan, pelaporan pekerjaan
            lapangan, monitoring progres, serta sinkronisasi data secara online
            dan offline.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/dashboard">
                Masuk ke Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#modul">Pelajari Modul</a>
            </Button>
          </div>
        </div>
      </section>

      <section
        id="modul"
        className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="rounded-2xl">
              <CardContent className="p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  {f.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
