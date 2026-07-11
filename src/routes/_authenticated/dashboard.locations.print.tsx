import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer, ArrowLeft, MapPin } from "lucide-react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/common/loading";
import { EmptyState } from "@/components/common/empty-state";
import { listLocations } from "@/lib/locations.functions";
import { printWithFilename } from "@/lib/print-filename";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  PrintStyles,
  PrintDocHeader,
  PrintDocFooter,
  PrintCover,
} from "@/components/print/print-shell";

const BUCKET = "location-photos";

export const Route = createFileRoute(
  "/_authenticated/dashboard/locations/print",
)({
  head: () => ({
    meta: [
      { title: "Cetak Daftar Lokasi · FWMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PrintLocationsPage,
});

function PrintLocationsPage() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["locations"],
    queryFn: () => listLocations(),
  });

  const rows = (q.data ?? []) as any[];
  const generatedBy =
    (user?.user_metadata as any)?.full_name || user?.email || "—";

  const allPaths = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => (r.photos ?? []).forEach((p: string) => s.add(p)));
    return Array.from(s);
  }, [rows]);

  const [signed, setSigned] = useState<Record<string, string>>({});
  useEffect(() => {
    if (allPaths.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(allPaths, 60 * 60);
      if (error || !data || cancelled) return;
      const next: Record<string, string> = {};
      data.forEach((d, i) => {
        if (d.signedUrl) next[allPaths[i]] = d.signedUrl;
      });
      setSigned(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [allPaths]);

  const withPhotos = rows.filter((r) => (r.photos ?? []).length > 0).length;
  const cities = new Set(rows.map((r) => r.city).filter(Boolean)).size;
  const categories = new Set(rows.map((r) => r.category).filter(Boolean)).size;

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "Dashboard", to: "/dashboard" },
        { label: "Lokasi", to: "/dashboard/locations" },
        { label: "Cetak PDF" },
      ]}
    >
      <div className="no-print">
        <PageHeader
          title="Cetak Daftar Lokasi"
          description="Tinjau daftar di bawah, lalu klik Cetak PDF."
          actions={
            <div className="flex gap-2">
              <Button asChild size="sm" variant="outline">
                <a href="/dashboard/locations">
                  <ArrowLeft className="h-4 w-4" />
                  Kembali
                </a>
              </Button>
              <Button
                size="sm"
                onClick={() => printWithFilename("Daftar-Lokasi")}
                disabled={rows.length === 0}
              >
                <Printer className="h-4 w-4" />
                Cetak PDF
              </Button>
            </div>
          }
        />
      </div>

      <div className="print-area print-doc">
        <div className="print-page">
          <PrintCover
            title="Daftar Lokasi Kerja"
            subtitle="Field Work Management System"
            generatedBy={generatedBy}
            stats={[
              { label: "Total Lokasi", value: rows.length },
              { label: "Dengan Foto", value: withPhotos },
              { label: "Kota", value: cities },
              { label: "Kategori", value: categories },
              {
                label: "Ber-koordinat",
                value: rows.filter((r) => r.latitude != null && r.longitude != null).length,
              },
              { label: "Dokumen", value: 1 },
            ]}
          />
        </div>

        <div className="print-page">
          <PrintDocHeader
            title="Daftar Lokasi Kerja"
            subtitle={`Total: ${rows.length} lokasi`}
          />

          {q.isLoading ? (
            <div className="no-print">
              <Loading />
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              title="Belum ada lokasi"
              description="Tambahkan lokasi terlebih dahulu."
            />
          ) : (
            <div className="grid gap-4">
              {rows.map((l, i) => (
                <LocationBlock
                  key={l.id}
                  index={i + 1}
                  loc={l}
                  signed={signed}
                />
              ))}
            </div>
          )}

          <PrintDocFooter generatedBy={generatedBy} />
        </div>
      </div>

      <PrintStyles />
    </DashboardLayout>
  );
}

function LocationBlock({
  index,
  loc,
  signed,
}: {
  index: number;
  loc: any;
  signed: Record<string, string>;
}) {
  const photos: string[] = (loc.photos ?? []).slice(0, 4);
  const coord =
    loc.latitude != null && loc.longitude != null
      ? `${Number(loc.latitude).toFixed(5)}, ${Number(loc.longitude).toFixed(5)}`
      : "—";
  return (
    <section className="loc-block print-card">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <div className="p-title">
            {index}. {loc.name}
          </div>
          <div className="p-muted" style={{ fontSize: 13 }}>
            {loc.category ?? "—"} · {loc.city ?? "—"}
            {loc.province ? `, ${loc.province}` : ""}
          </div>
        </div>
        <div className="p-caption" style={{ textAlign: "right" }}>
          <MapPin className="mr-1 inline h-3.5 w-3.5" />
          {coord}
        </div>
      </div>

      <div
        className="mb-2 grid gap-x-6 gap-y-1"
        style={{
          gridTemplateColumns: "repeat(2, minmax(0,1fr))",
          fontSize: 14,
          color: "#374151",
        }}
      >
        <div>
          <strong style={{ color: "#111827" }}>Alamat:</strong> {loc.address ?? "—"}
        </div>
        <div>
          <strong style={{ color: "#111827" }}>Kota:</strong> {loc.city ?? "—"}
          {loc.postal_code ? ` (${loc.postal_code})` : ""}
        </div>
        <div>
          <strong style={{ color: "#111827" }}>Kategori:</strong> {loc.category ?? "—"}
        </div>
        <div>
          <strong style={{ color: "#111827" }}>PIC:</strong> {loc.pic ?? "—"}
        </div>
      </div>

      {loc.notes ? (
        <div className="mb-2" style={{ fontSize: 14, color: "#374151" }}>
          <strong style={{ color: "#111827" }}>Keterangan:</strong>{" "}
          <span className="whitespace-pre-line">{loc.notes}</span>
        </div>
      ) : null}

      {photos.length > 0 ? (
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: "repeat(4, minmax(0,1fr))" }}
        >
          {photos.map((p, i) => (
            <div key={p}>
              <div
                style={{
                  aspectRatio: "4 / 3",
                  width: "100%",
                  overflow: "hidden",
                  borderRadius: 8,
                  border: "1px solid #D1D5DB",
                  background: "#F9FAFB",
                }}
              >
                {signed[p] ? (
                  <img
                    src={signed[p]}
                    alt={`Foto ${i + 1}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      color: "#6B7280",
                      fontSize: 11,
                    }}
                  >
                    Memuat…
                  </div>
                )}
              </div>
              <div
                className="mt-1 truncate"
                style={{ fontSize: 11, color: "#6B7280", textAlign: "center" }}
              >
                Foto {i + 1}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="italic" style={{ fontSize: 12, color: "#6B7280" }}>
          (Tanpa foto)
        </div>
      )}
    </section>
  );
}
