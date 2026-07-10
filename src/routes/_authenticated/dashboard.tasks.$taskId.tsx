import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, FileText, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loading } from "@/components/common/loading";
import {
  TaskPriorityBadge,
  TaskStatusBadge,
  TASK_STATUS_LABEL,
  TASK_STATUS_VALUES,
} from "@/components/tasks/task-badges";
import {
  assignTask,
  changeTaskStatus,
  deleteTask,
  getTask,
  listAssignableUsers,
} from "@/lib/tasks.functions";
import { listReports } from "@/lib/reports.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute(
  "/_authenticated/dashboard/tasks/$taskId",
)({
  head: () => ({
    meta: [
      { title: "Detail Tugas · FWMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TaskDetailPage,
});

function TaskDetailPage() {
  const { taskId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, isAdminTier, isManager } = useAuth();
  const canManage = isAdminTier || isManager;

  const detail = useQuery({
    queryKey: ["tasks", taskId],
    queryFn: () => getTask({ data: { id: taskId } }),
  });
  const users = useQuery({
    queryKey: ["assignable-users"],
    queryFn: () => listAssignableUsers(),
    enabled: canManage,
  });
  const reports = useQuery({
    queryKey: ["reports", taskId],
    queryFn: () => listReports({ data: { task_id: taskId } }),
  });

  const [newStatus, setNewStatus] = useState<string>("");
  const [note, setNote] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [assignees, setAssignees] = useState<string[] | null>(null);

  const currentAssignees = useMemo(
    () => (detail.data?.assignments ?? []).map((a: any) => a.assignee_id),
    [detail.data],
  );
  const effectiveAssignees = assignees ?? currentAssignees;

  const statusMut = useMutation({
    mutationFn: () =>
      changeTaskStatus({
        data: {
          id: taskId,
          to_status: newStatus as any,
          note: note || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Status diperbarui");
      setNewStatus("");
      setNote("");
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Gagal ubah status"),
  });

  const assignMut = useMutation({
    mutationFn: () =>
      assignTask({ data: { task_id: taskId, assignee_ids: effectiveAssignees } }),
    onSuccess: () => {
      toast.success("Petugas diperbarui");
      setAssignees(null);
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Gagal simpan petugas"),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteTask({ data: { id: taskId } }),
    onSuccess: () => {
      toast.success("Tugas dihapus");
      qc.invalidateQueries({ queryKey: ["tasks"] });
      navigate({ to: "/dashboard/tasks" });
    },
    onError: (e: any) => toast.error(e?.message ?? "Gagal hapus"),
  });

  if (detail.isLoading) {
    return (
      <DashboardLayout
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Dashboard", to: "/dashboard" },
          { label: "Penugasan", to: "/dashboard/tasks" },
          { label: "Detail" },
        ]}
      >
        <Loading />
      </DashboardLayout>
    );
  }

  if (detail.error || !detail.data) {
    return (
      <DashboardLayout
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Dashboard", to: "/dashboard" },
          { label: "Penugasan", to: "/dashboard/tasks" },
          { label: "Detail" },
        ]}
      >
        <p className="text-sm text-destructive">
          Tugas tidak ditemukan atau Anda tidak memiliki akses.
        </p>
      </DashboardLayout>
    );
  }

  const t = detail.data.task;
  const isAssignee = currentAssignees.includes(user?.id ?? "");
  const canChangeStatus = canManage || isAssignee;

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "Dashboard", to: "/dashboard" },
        { label: "Penugasan", to: "/dashboard/tasks" },
        { label: t.title },
      ]}
    >
      <PageHeader
        title={t.title}
        description={t.description ?? undefined}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: "/dashboard/tasks" })}
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </Button>
            {canChangeStatus ? (
              <Button asChild size="sm">
                <Link
                  to="/dashboard/tasks/$taskId/reports/new"
                  params={{ taskId }}
                >
                  <FileText className="h-4 w-4" />
                  Buat Laporan
                </Link>
              </Button>
            ) : null}
            {canManage ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Hapus
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ringkasan</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Status</div>
                <div className="mt-1"><TaskStatusBadge status={t.status} /></div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Prioritas</div>
                <div className="mt-1"><TaskPriorityBadge priority={t.priority} /></div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Jatuh Tempo</div>
                <div className="mt-1">
                  {t.due_date
                    ? new Date(t.due_date).toLocaleString("id-ID")
                    : "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Lokasi</div>
                <div className="mt-1">{t.location_text ?? "—"}</div>
              </div>
            </CardContent>
          </Card>

          {canChangeStatus ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ubah Status</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_STATUS_VALUES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {TASK_STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={1}
                  placeholder="Catatan (opsional)"
                />
                <Button
                  disabled={!newStatus || statusMut.isPending}
                  onClick={() => statusMut.mutate()}
                >
                  {statusMut.isPending ? "Menyimpan…" : "Simpan"}
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Laporan Lapangan</CardTitle>
            </CardHeader>
            <CardContent>
              {reports.isLoading ? (
                <Loading />
              ) : (reports.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Belum ada laporan.
                </p>
              ) : (
                <ul className="space-y-4">
                  {(reports.data ?? []).map((r: any) => (
                    <li key={r.id} className="rounded-md border p-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded bg-muted px-2 py-0.5 uppercase">
                          {r.report_type}
                        </span>
                        <span>
                          {new Date(r.reported_at).toLocaleString("id-ID")}
                        </span>
                        {r.latitude != null && r.longitude != null ? (
                          <span>
                            📍 {Number(r.latitude).toFixed(4)},{" "}
                            {Number(r.longitude).toFixed(4)}
                          </span>
                        ) : null}
                      </div>
                      {r.narrative ? (
                        <p className="mt-2 whitespace-pre-line text-sm">
                          {r.narrative}
                        </p>
                      ) : null}
                      {(r.attachments ?? []).length > 0 ? (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {r.attachments.length} lampiran
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Riwayat Status</CardTitle>
            </CardHeader>
            <CardContent>
              {detail.data.history.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada riwayat.</p>
              ) : (
                <ul className="space-y-3">
                  {detail.data.history.map((h: any) => (
                    <li
                      key={h.id}
                      className="flex flex-col gap-1 border-l-2 border-border pl-3 text-sm"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        {h.from_status ? (
                          <TaskStatusBadge status={h.from_status} />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Dibuat
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">→</span>
                        <TaskStatusBadge status={h.to_status} />
                        <span className="text-xs text-muted-foreground">
                          {new Date(h.changed_at).toLocaleString("id-ID")}
                        </span>
                      </div>
                      {h.note ? (
                        <p className="text-xs text-muted-foreground">{h.note}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Petugas</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {canManage ? (
                <>
                  {users.isLoading ? (
                    <Loading />
                  ) : (
                    <div className="grid gap-2">
                      {(users.data ?? []).map((u) => {
                        const checked = effectiveAssignees.includes(u.user_id);
                        return (
                          <label
                            key={u.user_id}
                            className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => {
                                setAssignees(
                                  v
                                    ? [...effectiveAssignees, u.user_id]
                                    : effectiveAssignees.filter(
                                        (id) => id !== u.user_id,
                                      ),
                                );
                              }}
                            />
                            <span className="text-sm">
                              {u.full_name || "(tanpa nama)"}
                              <span className="ml-2 text-xs text-muted-foreground">
                                {u.role}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      disabled={assignees === null || assignMut.isPending}
                      onClick={() => assignMut.mutate()}
                    >
                      {assignMut.isPending ? "Menyimpan…" : "Simpan Petugas"}
                    </Button>
                  </div>
                </>
              ) : currentAssignees.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada petugas.</p>
              ) : (
                <ul className="text-sm">
                  {currentAssignees.map((id) => (
                    <li key={id} className="py-1">
                      {id === user?.id ? "Anda" : id.slice(0, 8) + "…"}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus tugas ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Semua penugasan & riwayat
              status akan ikut terhapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMut.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
