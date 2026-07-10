import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Smartphone, ShieldCheck, Info } from "lucide-react";
import { PublicLayout } from "@/layouts/public-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { COMPANY_LOGO_URL, COMPANY_NAME } from "@/lib/company";

type AppVersion = {
  versionName: string;
  versionCode: number;
  apkUrl: string;
  releaseDate?: string;
  minimumVersionCode?: number;
  changelog?: string[];
};

export const Route = createFileRoute("/download")({
  head: () => ({
    meta: [
      { title: "Download APK — FWMS Petugas" },
      {
        name: "description",
        content:
          "Unduh aplikasi Android FWMS Petugas (Trusted Web Activity) untuk PT. MOSHA SERI NUSANTARA.",
      },
      { property: "og:title", content: "Download APK — FWMS Petugas" },
      { property: "og:description", content: "Unduh aplikasi Android FWMS Petugas." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: DownloadPage,
});

function DownloadPage() {
  const [version, setVersion] = useState<AppVersion | null>(null);
  const [size, setSize] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/app-version.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((v: AppVersion | null) => setVersion(v))
      .catch(() => setVersion(null));
  }, []);

  useEffect(() => {
    if (!version?.apkUrl) return;
    void fetch(version.apkUrl, { method: "HEAD" })
      .then((r) => {
        const len = r.headers.get("content-length");
        if (r.ok && len) {
          const mb = Number(len) / (1024 * 1024);
          setSize(`${mb.toFixed(1)} MB`);
        }
      })
      .catch(() => setSize(null));
  }, [version?.apkUrl]);

  return (
    <PublicLayout>
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          <img
            src={COMPANY_LOGO_URL}
            alt={`${COMPANY_NAME} logo`}
            className="h-16 w-auto"
          />
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            FWMS Petugas
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Aplikasi Android internal untuk petugas lapangan {COMPANY_NAME}.
          </p>
        </div>

        <Card className="mt-8">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Smartphone className="h-4 w-4" />
                  Android 8.0+
                </div>
                <div className="mt-1 text-2xl font-semibold">
                  Versi {version?.versionName ?? "—"}
                </div>
                <div className="text-xs text-muted-foreground">
                  Build {version?.versionCode ?? "—"}
                  {version?.releaseDate ? ` · ${version.releaseDate}` : ""}
                  {size ? ` · ${size}` : ""}
                </div>
              </div>
              <Button asChild size="lg" disabled={!version?.apkUrl}>
                <a href={version?.apkUrl ?? "#"} download>
                  <Download className="mr-2 h-4 w-4" />
                  Download APK
                </a>
              </Button>
            </div>

            {version?.changelog && version.changelog.length > 0 && (
              <div className="mt-6">
                <h2 className="text-sm font-semibold">Perubahan versi ini</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {version.changelog.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardContent className="space-y-3 p-6 text-sm">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <div className="font-medium">Panduan instalasi</div>
                <ol className="mt-1 list-decimal space-y-1 pl-5 text-muted-foreground">
                  <li>Unduh file APK dari tombol di atas.</li>
                  <li>
                    Buka <em>Settings → Security</em> dan izinkan{" "}
                    <em>Install dari sumber tidak dikenal</em> untuk browser Anda.
                  </li>
                  <li>Buka file APK dan tekan <em>Install</em>.</li>
                  <li>Login menggunakan akun petugas yang telah didaftarkan.</li>
                </ol>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-4 w-4 text-primary" />
              <p className="text-muted-foreground">
                Aplikasi ini ditujukan untuk petugas internal {COMPANY_NAME}.
                Distribusi di luar organisasi tidak diperkenankan.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </PublicLayout>
  );
}
