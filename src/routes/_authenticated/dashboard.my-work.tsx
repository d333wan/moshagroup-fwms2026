import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Activity,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  MapPin,
  UserCheck,
  Download,
} from "lucide-react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/common/empty-state";
import { TaskMap, type TaskPin } from "@/components/field/task-map";
import {
  TaskPriorityBadge,
  TaskStatusBadge,
} from "@/components/tasks/task-badges";
import { myFieldDashboard, updateMyStatus } from "@/lib/officers.functions";

const STATUS_OPTIONS = [
  { value: "available", label: "Tersedia" },
  { value: "on_duty", label: "Sedang Bertugas" },
  { value: "off_duty", label: "Selesai Bertugas" },
  { value: "leave", label: "Cuti / Izin" },
];

const REPORT_TYPE_LABEL: Record<string, string> = {
  progress: "Progres",
  completion: "Selesai",
  issue: "Masalah",
};

export const Route = createFileRoute("/_authenticated/dashboard/my-work")({
  head: () => ({
    meta: [
      { title: "Dashboard Petugas · FWMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyWorkPage,
});

function MyWorkPage() {
  const qc = useQueryClient();
  const dash = useQuery({
    queryKey: ["my-field-dashboard"],
    queryFn: () => myFieldDashboard(),
  });

  const setStatus = useMutation({
    mutationFn: (status: string) =>
      updateMyStatus({ data: { status: status as any } }),
    onSuccess: () => {
      toast.success("Status diperbarui");
      qc.invalidateQueries({ queryKey: ["my-field-dashboard"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Gagal ubah status"),
  });

  const data = dash.data;
  const pins = useMemo<TaskPin[]>(
    () =>
      (data?.allTasks ?? [])
        .filter(
          (t) => t.location && t.location.latitude != null && t.location.longitude != null,
        )
        .map((t) => ({
          id: t.id,
          title: t.title,
          lat: t.location!.latitude!,
          lon: t.location!.longitude!,
          address: t.location!.address ?? t.location!.name,
        })),
    [data],
  );

  const displayName = data?.profile?.full_name ?? "Petugas";

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "Dashboard", to: "/dashboard" },
        { label: "Petugas" },
      ]}
    >
      <PageHeader
        title={`Selamat bertugas, ${displayName}`}
        description={
          data?.profile?.job_title
            ? `${data.profile.job_title}${data.officer.department ? ` · ${data.officer.department}` : ""}`
            : "Ringkasan penugasan & laporan pribadi Anda."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/dashboard/reports/print">
                <Download className="h-4 w-4" />
                Unduh PDF Laporan
              </Link>
            </Button>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
            <Select
              value={data?.officer.status ?? "off_duty"}
              onValueChange={(v) => setStatus.mutate(v)}
              disabled={setStatus.isPending || dash.isLoading}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={CalendarClock}
          label="Tugas Hari Ini"
          value={data?.stats.todayCount ?? 0}
        />
        <StatCard
          icon={Activity}
          label="Sedang Berjalan"
          value={data?.stats.inProgressCount ?? 0}
        />
        <StatCard
          icon={CheckCircle2}
          label="Selesai"
          value={data?.stats.completedCount ?? 0}
        />
        <StatCard
          icon={FileText}
          label="Laporan Minggu Ini"
          value={data?.stats.reportsThisWeekCount ?? 0}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* Today's tasks */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4" /> Tugas Hari Ini
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard/tasks">Semua tugas</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {dash.isLoading ? (
              <p className="text-sm text-muted-foreground">Memuat…</p>
            ) : (data?.todayTasks.length ?? 0) === 0 ? (
              <EmptyState
                title="Tidak ada tugas hari ini"
                description="Cek tab semua tugas untuk melihat penugasan mendatang."
              />
            ) : (
              <ul className="divide-y">
                {data!.todayTasks.map((t) => (
                  <li key={t.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/dashboard/tasks/$taskId"
                        params={{ taskId: t.id }}
                        className="line-clamp-1 font-medium hover:underline"
                      >
                        {t.title}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <TaskPriorityBadge priority={t.priority as any} />
                        <TaskStatusBadge status={t.status as any} />
                        {(t.location?.name || t.location_text) && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {t.location?.name ?? t.location_text}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button size="sm" asChild>
                      <Link
                        to="/dashboard/field-reports/new/$taskId"
                        params={{ taskId: t.id }}
                      >
                        Buat Laporan
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" /> Laporan Terakhir
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.recentReports.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada laporan.</p>
            ) : (
              <ul className="space-y-3">
                {data!.recentReports.map((r: any) => (
                  <li key={r.id} className="rounded-md border p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-[10px]">
                        {REPORT_TYPE_LABEL[r.report_type] ?? r.report_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(r.reported_at).toLocaleString("id-ID", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    {r.narrative && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {r.narrative}
                      </p>
                    )}
                    <Link
                      to="/dashboard/tasks/$taskId"
                      params={{ taskId: r.task_id }}
                      className="mt-1 inline-block text-xs text-primary hover:underline"
                    >
                      Lihat tugas →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" /> Peta Lokasi Tugas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pins.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Tidak ada tugas dengan koordinat lokasi. Minta manajer melengkapi data
              lokasi.
            </p>
          ) : (
            <TaskMap pins={pins} />
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
