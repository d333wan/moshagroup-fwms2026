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

import { supabase } from "@/integrations/supabase/client";
import {
  COMPANY_ADDRESS,
  COMPANY_LOGO_URL,
  COMPANY_NAME,
} from "@/lib/company";

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
  const q = useQuery({
    queryKey: ["locations"],
    queryFn: () => listLocations(),
  });

  const rows = (q.data ?? []) as any[];

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
                onClick={() => window.print()}
                disabled={rows.length === 0}
              >
                <Printer className="h-4 w-4" />
                Cetak PDF
              </Button>
            </div>
          }
        />
      </div>

      <div className="print-area">
        <div className="mb-4 flex items-start justify-between border-b pb-3">
          <div className="flex items-center gap-3">
            <img
              src={COMPANY_LOGO_URL}
              alt="Logo"
              className="h-12 w-auto"
              crossOrigin="anonymous"
            />
            <div>
              <div className="text-base font-bold">{COMPANY_NAME}</div>
              <div className="text-xs text-muted-foreground">
                {COMPANY_ADDRESS}
              </div>
            </div>
          </div>
          <div className="text-right text-xs">
            <div className="font-semibold">Daftar Lokasi Kerja</div>
            <div>Dicetak: {new Date().toLocaleString("id-ID")}</div>
            <div>Total: {rows.length} lokasi</div>
          </div>
        </div>

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
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body { background: white !important; }
          .no-print, [data-sidebar], header { display: none !important; }
          main { padding: 0 !important; }
          .print-area { display: block !important; }
          .loc-block { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>
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
    <section className="loc-block rounded-md border p-3 text-xs">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-bold">
            {index}. {loc.name}
          </div>
          <div className="text-muted-foreground">
            {loc.category ?? "—"} · {loc.city ?? "—"}
            {loc.province ? `, ${loc.province}` : ""}
          </div>
        </div>
        <div className="text-right text-[10px] text-muted-foreground">
          <MapPin className="mr-1 inline h-3 w-3" />
          {coord}
        </div>
      </div>

      <div className="mb-2 grid gap-1 sm:grid-cols-2">
        <div>
          <strong>Alamat:</strong> {loc.address ?? "—"}
        </div>
        <div>
          <strong>Kota:</strong> {loc.city ?? "—"}
          {loc.postal_code ? ` (${loc.postal_code})` : ""}
        </div>
        <div>
          <strong>Kategori:</strong> {loc.category ?? "—"}
        </div>
        <div>
          <strong>PIC:</strong> {loc.pic ?? "—"}
        </div>
      </div>

      {loc.notes ? (
        <div className="mb-2">
          <strong>Keterangan:</strong>{" "}
          <span className="whitespace-pre-line">{loc.notes}</span>
        </div>
      ) : null}

      {photos.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {photos.map((p, i) =>
            signed[p] ? (
              <img
                key={p}
                src={signed[p]}
                alt={`Foto ${i + 1}`}
                className="h-32 w-full rounded border object-cover"
                crossOrigin="anonymous"
              />
            ) : (
              <div
                key={p}
                className="flex h-32 w-full items-center justify-center rounded border bg-muted text-[10px] text-muted-foreground"
              >
                Memuat…
              </div>
            ),
          )}
        </div>
      ) : (
        <div className="text-[10px] italic text-muted-foreground">
          (Tanpa foto)
        </div>
      )}
    </section>
  );
}
