import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { createTask, listAssignableUsers } from "@/lib/tasks.functions";
import {
  TASK_PRIORITY_LABEL,
  TASK_PRIORITY_VALUES,
} from "@/components/tasks/task-badges";
import { useAuth } from "@/hooks/use-auth";
import { Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard/tasks/new")({
  head: () => ({
    meta: [
      { title: "Buat Tugas · FWMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewTaskPage,
});

function NewTaskPage() {
  const { isAdminTier, isManager, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>("medium");
  const [dueDate, setDueDate] = useState<string>("");
  const [location, setLocation] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]);

  const users = useQuery({
    queryKey: ["assignable-users"],
    queryFn: () => listAssignableUsers(),
  });

  const create = useMutation({
    mutationFn: () =>
      createTask({
        data: {
          title,
          description: description || null,
          priority: priority as any,
          status: "draft",
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
          location_text: location || null,
          assignee_ids: assignees,
        },
      }),
    onSuccess: (res) => {
      toast.success("Tugas berhasil dibuat");
      qc.invalidateQueries({ queryKey: ["tasks"] });
      navigate({
        to: "/dashboard/tasks/$taskId",
        params: { taskId: res.id },
      });
    },
    onError: (e: any) => toast.error(e?.message ?? "Gagal membuat tugas"),
  });

  if (loading) return null;
  if (!isAdminTier && !isManager)
    return <Navigate to="/dashboard/tasks" />;

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "Dashboard", to: "/dashboard" },
        { label: "Penugasan", to: "/dashboard/tasks" },
        { label: "Buat" },
      ]}
    >
      <PageHeader
        title="Buat Tugas"
        description="Isi detail tugas dan tetapkan petugas lapangan."
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate({ to: "/dashboard/tasks" })}>
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4 sm:p-6">
          <form
            className="grid gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (title.trim().length < 3) {
                toast.error("Judul minimal 3 karakter");
                return;
              }
              create.mutate();
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="title">Judul</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="mis. Pemeriksaan Gardu Blok A"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="desc">Deskripsi</Label>
              <Textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Detail pekerjaan, ekspektasi hasil…"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Prioritas</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
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
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="loc">Lokasi</Label>
              <Input
                id="loc"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Alamat / titik kerja"
              />
            </div>

            <div className="grid gap-2">
              <Label>Petugas</Label>
              <div className="rounded-md border p-3">
                {users.isLoading ? (
                  <p className="text-sm text-muted-foreground">Memuat…</p>
                ) : (users.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Belum ada petugas aktif untuk ditugaskan.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(users.data ?? []).map((u) => {
                      const checked = assignees.includes(u.user_id);
                      return (
                        <label
                          key={u.user_id}
                          className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              setAssignees((prev) =>
                                v
                                  ? [...prev, u.user_id]
                                  : prev.filter((id) => id !== u.user_id),
                              );
                            }}
                          />
                          <span className="text-sm">
                            {u.full_name || "(tanpa nama)"}
                            <span className="ml-2 text-xs text-muted-foreground">
                              {u.job_title ?? u.role}
                              {u.phone ? ` · ${u.phone}` : ""}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate({ to: "/dashboard/tasks" })}
              >
                Batal
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Menyimpan…" : "Simpan"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
