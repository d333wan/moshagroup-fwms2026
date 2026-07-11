import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList,
  Users,
  MapPin,
  Activity,
} from "lucide-react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { listTasks } from "@/lib/tasks.functions";
import {
  TaskPriorityBadge,
  TaskStatusBadge,
} from "@/components/tasks/task-badges";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({
    meta: [
      { title: "Dashboard · FWMS" },
      {
        name: "description",
        content: "Ringkasan operasional Field Work Management System.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardHome,
});

function DashboardHome() {
  const { user, roles, isAdmin, isManager, isAdminTier, isSuperAdmin, isPetugas } = useAuth();
  const petugasOnly = isPetugas && !isAdminTier && !isManager && !isSuperAdmin;
  if (petugasOnly) {
    return <Navigate to="/dashboard/my-work" replace />;
  }
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email ??
    "User";

  const tasks = useQuery({
    queryKey: ["tasks", "dashboard"],
    queryFn: () => listTasks({ data: {} }),
    enabled: !!user,
  });

  const rows = tasks.data ?? [];
  const active = rows.filter((t) =>
    ["assigned", "in_progress", "on_hold"].includes(t.status),
  );
  const recent = rows.slice(0, 5);

  const stats = [
    { label: "Tugas Aktif", value: String(active.length), icon: ClipboardList },
    { label: "Total Tugas", value: String(rows.length), icon: Activity },
    {
      label: "Selesai",
      value: String(rows.filter((t) => t.status === "completed").length),
      icon: Users,
    },
    {
      label: "Mendesak",
      value: String(rows.filter((t) => t.priority === "urgent").length),
      icon: MapPin,
    },
  ];

  return (
    <DashboardLayout
      breadcrumbs={[{ label: "Home", to: "/" }, { label: "Dashboard" }]}
    >
      <PageHeader
        title={`Login :\u00a0 ${displayName}`}
        description={
          roles.length > 0
            ? `Peran aktif: ${roles.join(", ")}.`
            : "Anda belum memiliki peran khusus. Hubungi admin."
        }
        actions={
          (isAdminTier || isManager) && (
            <Button asChild size="sm">
              <Link to="/dashboard/tasks/new">Buat Tugas</Link>
            </Button>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
              <s.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-foreground">
                {tasks.isLoading ? "…" : s.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Tugas Terbaru</CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link to="/dashboard/tasks">Lihat semua</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {tasks.isLoading ? (
              <p className="text-sm text-muted-foreground">Memuat…</p>
            ) : recent.length === 0 ? (
              <EmptyState
                title="Belum ada tugas"
                description={
                  isAdminTier || isManager
                    ? "Buat tugas pertama Anda."
                    : "Belum ada tugas yang ditugaskan kepada Anda."
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((t) => (
                  <li key={t.id} className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      <Link
                        to="/dashboard/tasks/$taskId"
                        params={{ taskId: t.id }}
                        className="text-sm font-medium text-foreground hover:underline"
                      >
                        {t.title}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {t.due_date
                          ? new Date(t.due_date).toLocaleDateString("id-ID")
                          : "Tanpa jatuh tempo"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TaskPriorityBadge priority={t.priority} />
                      <TaskStatusBadge status={t.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
