import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Printer, Search } from "lucide-react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loading } from "@/components/common/loading";
import { EmptyState } from "@/components/common/empty-state";
import { listTasks } from "@/lib/tasks.functions";
import {
  TaskPriorityBadge,
  TaskStatusBadge,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  TASK_PRIORITY_VALUES,
  TASK_STATUS_VALUES,
} from "@/components/tasks/task-badges";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/dashboard/tasks/")({
  head: () => ({
    meta: [
      { title: "Penugasan · FWMS" },
      { name: "description", content: "Daftar penugasan lapangan." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TasksListPage,
});

function TasksListPage() {
  const { isAdminTier, isManager } = useAuth();
  const canCreate = isAdminTier || isManager;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");

  const query = useQuery({
    queryKey: ["tasks", { status, priority, search }],
    queryFn: () =>
      listTasks({
        data: {
          status: status === "all" ? undefined : (status as any),
          priority: priority === "all" ? undefined : (priority as any),
          search: search.trim() || undefined,
        },
      }),
  });

  const rows = useMemo(() => query.data ?? [], [query.data]);

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "Dashboard", to: "/dashboard" },
        { label: "Penugasan" },
      ]}
    >
      <PageHeader
        title="Penugasan"
        description="Kelola tugas lapangan, status, dan petugas yang ditugaskan."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard/tasks/print" target="_blank">
                <Printer className="h-4 w-4" />
                Cetak Laporan
              </Link>
            </Button>
            {canCreate ? (
              <Button asChild size="sm">
                <Link to="/dashboard/tasks/new">
                  <Plus className="h-4 w-4" />
                  Buat Tugas
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari judul tugas…"
                className="pl-9"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua status</SelectItem>
                {TASK_STATUS_VALUES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {TASK_STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Prioritas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua prioritas</SelectItem>
                {TASK_PRIORITY_VALUES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {TASK_PRIORITY_LABEL[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {query.isLoading ? (
            <Loading />
          ) : rows.length === 0 ? (
            <EmptyState
              title="Belum ada tugas"
              description={
                canCreate
                  ? "Klik 'Buat Tugas' untuk menambahkan tugas pertama."
                  : "Belum ada tugas yang ditugaskan kepada Anda."
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Judul</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prioritas</TableHead>
                    <TableHead>Jatuh Tempo</TableHead>
                    <TableHead>Petugas</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium text-foreground">
                        <Link
                          to="/dashboard/tasks/$taskId"
                          params={{ taskId: t.id }}
                          className="hover:underline"
                        >
                          {t.title}
                        </Link>
                        {t.location_text ? (
                          <div className="text-xs text-muted-foreground">
                            {t.location_text}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <TaskStatusBadge status={t.status} />
                      </TableCell>
                      <TableCell>
                        <TaskPriorityBadge priority={t.priority} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t.due_date
                          ? new Date(t.due_date).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t.assignee_ids.length} orang
                      </TableCell>
                      <TableCell>
                        <Button asChild size="sm" variant="ghost">
                          <Link
                            to="/dashboard/tasks/$taskId"
                            params={{ taskId: t.id }}
                          >
                            Detail
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
