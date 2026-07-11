import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer, ArrowLeft } from "lucide-react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/common/loading";
import { EmptyState } from "@/components/common/empty-state";
import { listOfficers } from "@/lib/officers.functions";
import { printWithFilename } from "@/lib/print-filename";

import { useAuth } from "@/hooks/use-auth";
import {
  COMPANY_ADDRESS,
  COMPANY_LOGO_URL,
  COMPANY_NAME,
} from "@/lib/company";

const STATUS_LABEL: Record<string, string> = {
  available: "Tersedia",
  on_duty: "Bertugas",
  off_duty: "Libur",
  leave: "Cuti",
};

export const Route = createFileRoute(
  "/_authenticated/dashboard/officers/print",
)({
  head: () => ({
    meta: [
      { title: "Cetak Daftar Petugas · FWMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PrintOfficersPage,
});

function PrintOfficersPage() {
  const { isAdminTier, isManager, loading } = useAuth();
  const q = useQuery({
    queryKey: ["officers"],
    queryFn: () => listOfficers(),
    enabled: isAdminTier || isManager,
  });

  if (loading) return null;
  if (!isAdminTier && !isManager) return <Navigate to="/dashboard" />;

  const rows = (q.data ?? []) as any[];

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "Dashboard", to: "/dashboard" },
        { label: "Petugas Lapangan", to: "/dashboard/officers" },
        { label: "Cetak PDF" },
      ]}
    >
      <div className="no-print">
        <PageHeader
          title="Cetak Daftar Petugas Lapangan"
          description="Tinjau daftar di bawah, lalu klik Cetak PDF."
          actions={
            <div className="flex gap-2">
              <Button asChild size="sm" variant="outline">
                <a href="/dashboard/officers">
                  <ArrowLeft className="h-4 w-4" />
                  Kembali
                </a>
              </Button>
              <Button
                size="sm"
                onClick={() => printWithFilename("Daftar-Petugas-Lapangan")}
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
            <div className="font-semibold">Daftar Petugas Lapangan</div>
            <div>Dicetak: {new Date().toLocaleString("id-ID")}</div>
            <div>Total: {rows.length} petugas</div>
          </div>
        </div>

        {q.isLoading ? (
          <Loading />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Belum ada petugas"
            description="Tambahkan pengguna dengan peran petugas lapangan terlebih dahulu."
          />
        ) : (
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-muted/40">
                <th className="border px-2 py-1 text-left">No</th>
                <th className="border px-2 py-1 text-left">Nama</th>
                <th className="border px-2 py-1 text-left">Jabatan</th>
                <th className="border px-2 py-1 text-left">No. HP</th>
                <th className="border px-2 py-1 text-left">Departemen</th>
                <th className="border px-2 py-1 text-left">No. KTP</th>
                <th className="border px-2 py-1 text-left">Alamat</th>
                <th className="border px-2 py-1 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o, i) => (
                <tr key={o.user_id} className="align-top">
                  <td className="border px-2 py-1">{i + 1}</td>
                  <td className="border px-2 py-1 font-medium">
                    {o.full_name || "(tanpa nama)"}
                    {o.employee_id ? (
                      <div className="text-[10px] text-muted-foreground">
                        NIP: {o.employee_id}
                      </div>
                    ) : null}
                  </td>
                  <td className="border px-2 py-1">{o.job_title ?? "—"}</td>
                  <td className="border px-2 py-1">{o.phone ?? "—"}</td>
                  <td className="border px-2 py-1">{o.department ?? "—"}</td>
                  <td className="border px-2 py-1">{o.nik ?? "—"}</td>
                  <td className="border px-2 py-1">{o.address ?? "—"}</td>
                  <td className="border px-2 py-1">
                    {STATUS_LABEL[o.status] ?? o.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-10 grid grid-cols-2 gap-8 text-xs">
          <div />
          <div className="text-center">
            <div>
              {new Date().toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
            <div className="mt-1">Mengetahui,</div>
            <div className="mt-16 font-semibold underline">
              ( ................................ )
            </div>
            <div>Manajer / Admin</div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 12mm; }
          body { background: white !important; }
          .no-print, [data-sidebar], header { display: none !important; }
          main { padding: 0 !important; }
          .print-area { display: block !important; }
          table { font-size: 10px; }
          thead { display: table-header-group; }
          tr { break-inside: avoid; }
        }
      `}</style>
    </DashboardLayout>
  );
}
