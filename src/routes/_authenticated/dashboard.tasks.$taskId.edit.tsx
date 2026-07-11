import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loading } from "@/components/common/loading";
import { getTask, updateTask } from "@/lib/tasks.functions";
import {
  TASK_PRIORITY_LABEL,
  TASK_PRIORITY_VALUES,
} from "@/components/tasks/task-badges";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute(
  "/_authenticated/dashboard/tasks/$taskId/edit",
)({
  head: () => ({
    meta: [
      { title: "Edit Tugas · FWMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TaskEditPage,
});

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function TaskEditPage() {
  const { taskId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAdminTier, isManager } = useAuth();
  const canManage = isAdminTier || isManager;

  const detail = useQuery({
    queryKey: ["tasks", taskId],
    queryFn: () => getTask({ data: { id: taskId } }),
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>("medium");
  const [dueDate, setDueDate] = useState<string>("");
  const [locationText, setLocationText] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (detail.data && !ready) {
      const t = detail.data.task;
      setTitle(t.title ?? "");
      setDescription(t.description ?? "");
      setPriority(t.priority ?? "medium");
      setDueDate(toDateInputValue(t.due_date ?? null));
      setLocationText(t.location_text ?? "");
      setReady(true);
    }
  }, [detail.data, ready]);

  const mut = useMutation({
    mutationFn: () =>
      updateTask({
        data: {
          id: taskId,
          patch: {
            title: title.trim(),
            description: description.trim() ? description.trim() : null,
            priority: priority as any,
            due_date: dueDate ? new Date(dueDate).toISOString() : null,
            location_text: locationText.trim() ? locationText.trim() : null,
          },
        },
      }),
    onSuccess: () => {
      toast.success("Tugas diperbarui");
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["tasks", taskId] });
      navigate({ to: "/dashboard/tasks/$taskId", params: { taskId } });
    },
    onError: (e: any) => toast.error(e?.message ?? "Gagal memperbarui tugas"),
  });

  const breadcrumbs = [
    { label: "Home", to: "/" },
    { label: "Dashboard", to: "/dashboard" },
    { label: "Penugasan", to: "/dashboard/tasks" },
    { label: "Edit" },
  ];

  if (detail.isLoading || !ready) {
    return (
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <Loading />
      </DashboardLayout>
    );
  }

  if (!canManage) {
    return (
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <p className="text-sm text-destructive">
          Anda tidak memiliki akses untuk mengedit tugas.
        </p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        title="Edit Penugasan"
        description="Perbarui informasi penugasan. Tanggal perubahan akan tersimpan."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              navigate({
                to: "/dashboard/tasks/$taskId",
                params: { taskId },
              })
            }
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4 sm:p-6">
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (title.trim().length < 3) {
                toast.error("Judul minimal 3 karakter");
                return;
              }
              mut.mutate();
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="title">Judul</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                minLength={3}
                maxLength={200}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={4000}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="priority">Prioritas</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_PRIORITY_VALUES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {TASK_PRIORITY_LABEL[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="due">Jatuh Tempo</Label>
                <Input
                  id="due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="location">Lokasi</Label>
              <Input
                id="location"
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                maxLength={500}
                placeholder="Alamat / nama lokasi"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  navigate({
                    to: "/dashboard/tasks/$taskId",
                    params: { taskId },
                  })
                }
              >
                Batal
              </Button>
              <Button type="submit" disabled={mut.isPending}>
                <Save className="h-4 w-4" />
                {mut.isPending ? "Menyimpan…" : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
