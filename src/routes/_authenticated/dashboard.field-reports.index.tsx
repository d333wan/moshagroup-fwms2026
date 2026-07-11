import { useMemo, useState } from "react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, FileText, MapPin, AlertTriangle, CheckCircle2, RotateCcw, Send } from "lucide-react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { listMyFieldReports, FIELD_REPORT_STATUS_LABEL, FIELD_WORK_STATUS_LABEL } from "@/lib/field-reports.functions";
import { listTasks } from "@/lib/tasks.functions";

export const Route = createFileRoute("/_authenticated/dashboard/field-reports/")({
  head: () => ({
    meta: [
      { title: "Laporan Lapangan · FWMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FieldReportsPage,
});

function FieldReportsPage() {
  const { user, loading } = useAuth();
  const reports = useQuery({
    queryKey: ["field-reports", "mine"],
    queryFn: () => listMyFieldReports(),
    enabled: !!user,
  });
  const myTasks = useQuery({
    queryKey: ["tasks", "mine"],
    queryFn: () => listTasks({ data: { assigneeId: user?.id } as any }),
    enabled: !!user,
  });

  const kpi = useMemo(() => {
    const r = (reports.data ?? []) as any[];
    const today = new Date().toISOString().slice(0, 10);
    return {
      active: (myTasks.data ?? []).filter((t: any) => t.status !== "completed" && t.status !== "cancelled").length,
      today: r.filter((x) => x.report_date === today).length,
      draft: r.filter((x) => x.status === "draft").length,
      revision: r.filter((x) => x.status === "needs_revision").length,
      approved: r.filter((x) => x.status === "approved").length,
      obstacle: r.filter((x) => x.has_obstacle).length,
    };
  }, [reports.data, myTasks.data]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "Dashboard", to: "/dashboard" },
        { label: "Laporan Lapangan" },
      ]}
    >
      <PageHeader
        title="Laporan Lapangan"
        description="Kirim bukti kehadiran, foto, dan progres kerja lapangan."
        actions={
          <Link to="/dashboard/my-work">
            <Button size="sm">
              <Plus className="h-4 w-4" /> Buat Laporan
            </Button>
          </Link>
        }
      />

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6 mb-4">
        <Kpi label="Tugas Aktif" value={kpi.active} icon={FileText} />
        <Kpi label="Laporan Hari Ini" value={kpi.today} icon={Send} />
        <Kpi label="Draft" value={kpi.draft} icon={FileText} />
        <Kpi label="Perlu Revisi" value={kpi.revision} icon={RotateCcw} />
        <Kpi label="Disetujui" value={kpi.approved} icon={CheckCircle2} />
        <Kpi label="Kendala" value={kpi.obstacle} icon={AlertTriangle} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tugas Aktif Anda</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {(myTasks.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada tugas yang ditugaskan.</p>
          ) : (
            (myTasks.data ?? [])
              .filter((t: any) => t.status !== "completed" && t.status !== "cancelled")
              .map((t: any) => (
                <div
                  key={t.id}
                  className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="break-words font-medium text-sm sm:text-base">{t.title}</div>
                    <div className="break-words text-xs text-muted-foreground sm:text-sm">
                      <MapPin className="inline h-3 w-3" /> {t.location_text ?? "—"}
                    </div>
                  </div>
                  <Link
                    to="/dashboard/field-reports/new/$taskId"
                    params={{ taskId: t.id }}
                    className="w-full sm:w-auto shrink-0"
                  >
                    <Button size="sm" variant="secondary" className="w-full sm:w-auto">
                      <Plus className="h-4 w-4" /> Buat Laporan
                    </Button>
                  </Link>
                </div>
              ))
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Riwayat Laporan Saya</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {(reports.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada laporan.</p>
          ) : (
            (reports.data ?? []).map((r: any) => (
              <Link
                key={r.id}
                to="/dashboard/field-reports/$reportId"
                params={{ reportId: r.id }}
                className="flex flex-col gap-2 rounded-md border p-3 hover:bg-accent/40 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="break-words font-medium text-sm">
                    {r.report_number} · {r.task?.title ?? "—"}
                  </div>
                  <div className="break-words text-xs text-muted-foreground">
                    {r.report_date} {r.report_time?.slice(0, 5)} · {FIELD_WORK_STATUS_LABEL[r.work_status as keyof typeof FIELD_WORK_STATUS_LABEL]} · Progres {r.progress_percent}%
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {r.has_obstacle ? <Badge variant="destructive">Kendala</Badge> : null}
                  {r.within_radius === false ? <Badge variant="outline">Di luar radius</Badge> : null}
                  <Badge>{FIELD_REPORT_STATUS_LABEL[r.status as keyof typeof FIELD_REPORT_STATUS_LABEL]}</Badge>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

function Kpi({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-2xl font-semibold">{value}</div>
          </div>
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}
