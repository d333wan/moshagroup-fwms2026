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
  PrintStyles,
  PrintDocHeader,
  PrintDocFooter,
  PrintCover,
  StatusBadge,
} from "@/components/print/print-shell";

const STATUS_LABEL: Record<string, string> = {
  available: "Tersedia",
  on_duty: "Bertugas",
  off_duty: "Libur",
  leave: "Cuti",
};

const STATUS_KEY: Record<string, string> = {
  available: "completed",
  on_duty: "in_progress",
  off_duty: "pending",
  leave: "assigned",
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
  const { isAdminTier, isManager, loading, user } = useAuth();
  const q = useQuery({
    queryKey: ["officers"],
    queryFn: () => listOfficers(),
    enabled: isAdminTier || isManager,
  });

  if (loading) return null;
  if (!isAdminTier && !isManager) return <Navigate to="/dashboard" />;

  const rows = (q.data ?? []) as any[];
  const generatedBy =
    (user?.user_metadata as any)?.full_name || user?.email || "—";

  const byStatus = rows.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

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

      <div className="print-area print-doc">
        <div className="print-page">
          <PrintCover
            title="Daftar Petugas Lapangan"
            subtitle="Field Work Management System"
            generatedBy={generatedBy}
            stats={[
              { label: "Total Petugas", value: rows.length },
              { label: "Tersedia", value: byStatus.available ?? 0 },
              { label: "Bertugas", value: byStatus.on_duty ?? 0 },
              { label: "Libur", value: byStatus.off_duty ?? 0 },
              { label: "Cuti", value: byStatus.leave ?? 0 },
              {
                label: "Departemen",
                value: new Set(rows.map((r) => r.department).filter(Boolean)).size,
              },
            ]}
          />
        </div>

        <div className="print-page">
          <PrintDocHeader
            title="Daftar Petugas Lapangan"
            subtitle={`Total: ${rows.length} petugas`}
          />

          {q.isLoading ? (
            <Loading />
          ) : rows.length === 0 ? (
            <EmptyState
              title="Belum ada petugas"
              description="Tambahkan pengguna dengan peran petugas lapangan terlebih dahulu."
            />
          ) : (
            <table
              className="w-full border-collapse"
              style={{ fontSize: 13, color: "#1F2937" }}
            >
              <thead>
                <tr style={{ background: "#F3F4F6", color: "#111827" }}>
                  <th className="border px-2 py-2 text-left" style={{ borderColor: "#D1D5DB" }}>No</th>
                  <th className="border px-2 py-2 text-left" style={{ borderColor: "#D1D5DB" }}>Nama</th>
                  <th className="border px-2 py-2 text-left" style={{ borderColor: "#D1D5DB" }}>Jabatan</th>
                  <th className="border px-2 py-2 text-left" style={{ borderColor: "#D1D5DB" }}>No. HP</th>
                  <th className="border px-2 py-2 text-left" style={{ borderColor: "#D1D5DB" }}>Departemen</th>
                  <th className="border px-2 py-2 text-left" style={{ borderColor: "#D1D5DB" }}>No. KTP</th>
                  <th className="border px-2 py-2 text-left" style={{ borderColor: "#D1D5DB" }}>Alamat</th>
                  <th className="border px-2 py-2 text-left" style={{ borderColor: "#D1D5DB" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o, i) => (
                  <tr key={o.user_id} className="align-top">
                    <td className="border px-2 py-2" style={{ borderColor: "#D1D5DB" }}>{i + 1}</td>
                    <td className="border px-2 py-2 font-medium" style={{ borderColor: "#D1D5DB", color: "#111827" }}>
                      {o.full_name || "(tanpa nama)"}
                      {o.employee_id ? (
                        <div style={{ fontSize: 11, color: "#6B7280" }}>
                          NIP: {o.employee_id}
                        </div>
                      ) : null}
                    </td>
                    <td className="border px-2 py-2" style={{ borderColor: "#D1D5DB" }}>{o.job_title ?? "—"}</td>
                    <td className="border px-2 py-2" style={{ borderColor: "#D1D5DB" }}>{o.phone ?? "—"}</td>
                    <td className="border px-2 py-2" style={{ borderColor: "#D1D5DB" }}>{o.department ?? "—"}</td>
                    <td className="border px-2 py-2" style={{ borderColor: "#D1D5DB" }}>{o.nik ?? "—"}</td>
                    <td className="border px-2 py-2" style={{ borderColor: "#D1D5DB" }}>{o.address ?? "—"}</td>
                    <td className="border px-2 py-2" style={{ borderColor: "#D1D5DB" }}>
                      <StatusBadge
                        status={STATUS_KEY[o.status] ?? "pending"}
                        label={STATUS_LABEL[o.status] ?? o.status}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="mt-10 grid grid-cols-2 gap-8" style={{ fontSize: 13 }}>
            <div />
            <div className="text-center">
              <div style={{ color: "#374151" }}>
                {new Date().toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <div className="mt-1" style={{ color: "#374151" }}>Mengetahui,</div>
              <div className="mt-16 font-semibold underline" style={{ color: "#111827" }}>
                ( ................................ )
              </div>
              <div style={{ color: "#4B5563" }}>Manajer / Admin</div>
            </div>
          </div>

          <PrintDocFooter generatedBy={generatedBy} />
        </div>
      </div>

      <PrintStyles landscape />
    </DashboardLayout>
  );
}
