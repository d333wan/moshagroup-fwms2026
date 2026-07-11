import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Search } from "lucide-react";
import calendarIcon from "@/assets/calendar-picker-icon.png";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createTask, listAssignableUsers } from "@/lib/tasks.functions";
import { listLocations } from "@/lib/locations.functions";
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
  const [selectedLoc, setSelectedLoc] = useState<any | null>(null);
  const [locPickerOpen, setLocPickerOpen] = useState(false);
  const [locSearch, setLocSearch] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [supCompany, setSupCompany] = useState("");
  const [supPerson, setSupPerson] = useState("");
  const [supJob, setSupJob] = useState("");
  const [supPhone, setSupPhone] = useState("");
  const [supWa, setSupWa] = useState("");
  const [emergency1, setEmergency1] = useState("");
  const [emergency2, setEmergency2] = useState("");
  const [vehType, setVehType] = useState("");
  const [vehPlate, setVehPlate] = useState("");
  const [dirMode, setDirMode] = useState<"none" | "single" | "four_way">("single");
  const [radius, setRadius] = useState<number>(100);

  const locations = useQuery({
    queryKey: ["locations"],
    queryFn: () => listLocations(),
    enabled: locPickerOpen,
  });

  const filteredLocs = useMemo(() => {
    const list = (locations.data ?? []) as any[];
    const q = locSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((l) =>
      [l.name, l.address, l.city, l.province, l.pic, l.category]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(q)),
    );
  }, [locations.data, locSearch]);

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
          location_id: selectedLoc?.id || null,
          assignee_ids: assignees,
          supervisor_company_name: supCompany || null,
          supervisor_person_name: supPerson || null,
          supervisor_job_title: supJob || null,
          supervisor_phone: supPhone || null,
          supervisor_whatsapp: supWa || null,
          emergency_contact_primary: emergency1 || null,
          emergency_contact_secondary: emergency2 || null,
          default_vehicle_type: vehType || null,
          default_license_plate: vehPlate || null,
          photo_direction_mode: dirMode,
          radius_meters: radius,
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
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="due-calendar-input pr-11"
                  style={{
                    backgroundImage: `url(${calendarIcon})`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 0.6rem center",
                    backgroundSize: "28px 28px",
                  }}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="loc">Lokasi</Label>
              <div className="flex gap-2">
                <Input
                  id="loc"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    setSelectedLoc(null);
                  }}
                  placeholder="Pilih dari data lokasi atau ketik manual"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocPickerOpen(true)}
                >
                  <MapPin className="h-4 w-4" />
                  Pilih Lokasi
                </Button>
              </div>
              {selectedLoc ? (
                <div className="rounded-md border bg-muted/40 p-3 text-sm">
                  <div className="font-medium">{selectedLoc.name}</div>
                  <div className="mt-1 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                    <div>
                      <span className="font-medium text-foreground">Alamat: </span>
                      {[selectedLoc.address, selectedLoc.city, selectedLoc.province, selectedLoc.postal_code]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">PIC: </span>
                      {selectedLoc.pic || "—"}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Koordinat: </span>
                      {selectedLoc.latitude != null && selectedLoc.longitude != null
                        ? `${Number(selectedLoc.latitude).toFixed(6)}, ${Number(selectedLoc.longitude).toFixed(6)}`
                        : "—"}
                    </div>
                    {selectedLoc.category ? (
                      <div>
                        <span className="font-medium text-foreground">Kategori: </span>
                        {selectedLoc.category}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <details className="rounded-md border p-3">
              <summary className="cursor-pointer text-sm font-medium">Supervisor Perusahaan & Kontak Darurat (opsional)</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div><Label>Nama Perusahaan</Label><Input value={supCompany} onChange={(e) => setSupCompany(e.target.value)} /></div>
                <div><Label>Nama Supervisor</Label><Input value={supPerson} onChange={(e) => setSupPerson(e.target.value)} /></div>
                <div><Label>Jabatan</Label><Input value={supJob} onChange={(e) => setSupJob(e.target.value)} /></div>
                <div><Label>Telepon Supervisor</Label><Input value={supPhone} onChange={(e) => setSupPhone(e.target.value)} /></div>
                <div><Label>WhatsApp Supervisor</Label><Input value={supWa} onChange={(e) => setSupWa(e.target.value)} placeholder="6281..." /></div>
                <div><Label>Kontak Darurat Utama</Label><Input value={emergency1} onChange={(e) => setEmergency1(e.target.value)} /></div>
                <div><Label>Kontak Darurat Cadangan</Label><Input value={emergency2} onChange={(e) => setEmergency2(e.target.value)} /></div>
              </div>
            </details>

            <details className="rounded-md border p-3">
              <summary className="cursor-pointer text-sm font-medium">Kendaraan & Dokumentasi (opsional)</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div><Label>Jenis Kendaraan</Label><Input value={vehType} onChange={(e) => setVehType(e.target.value)} /></div>
                <div><Label>Nomor Plat</Label><Input value={vehPlate} onChange={(e) => setVehPlate(e.target.value)} /></div>
                <div>
                  <Label>Mode Dokumentasi Foto Arah</Label>
                  <Select value={dirMode} onValueChange={(v) => setDirMode(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Foto lokasi biasa</SelectItem>
                      <SelectItem value="four_way">Empat arah</SelectItem>
                      <SelectItem value="none">Tidak diperlukan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Radius Toleransi (meter)</Label>
                  <Input type="number" min={10} max={10000} value={radius} onChange={(e) => setRadius(Number(e.target.value) || 100)} />
                </div>
              </div>
            </details>


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
      <style>{`
        .due-calendar-input::-webkit-calendar-picker-indicator {
          display: none;
          -webkit-appearance: none;
          appearance: none;
        }
        .due-calendar-input::-moz-calendar-picker-indicator {
          display: none;
        }
      `}</style>

      <Dialog open={locPickerOpen} onOpenChange={setLocPickerOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Pilih Lokasi</DialogTitle>
            <DialogDescription>
              Pilih lokasi kerja dari data lokasi terdaftar.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={locSearch}
              onChange={(e) => setLocSearch(e.target.value)}
              placeholder="Cari nama, alamat, kota, PIC…"
              className="pl-9"
            />
          </div>
          <div className="max-h-[60vh] overflow-auto rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Alamat</TableHead>
                  <TableHead>Kota</TableHead>
                  <TableHead>PIC</TableHead>
                  <TableHead>Koordinat</TableHead>
                  <TableHead className="w-24 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                      Memuat…
                    </TableCell>
                  </TableRow>
                ) : filteredLocs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                      Tidak ada lokasi.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLocs.map((l: any) => (
                    <TableRow
                      key={l.id}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedLoc(l);
                        setLocation(
                          [l.name, l.address, l.city].filter(Boolean).join(", "),
                        );
                        setLocPickerOpen(false);
                      }}
                    >
                      <TableCell className="font-medium">{l.name}</TableCell>
                      <TableCell className="max-w-[240px] truncate text-xs text-muted-foreground">
                        {l.address || "—"}
                      </TableCell>
                      <TableCell className="text-xs">{l.city || "—"}</TableCell>
                      <TableCell className="text-xs">{l.pic || "—"}</TableCell>
                      <TableCell className="text-xs">
                        {l.latitude != null && l.longitude != null
                          ? `${Number(l.latitude).toFixed(4)}, ${Number(l.longitude).toFixed(4)}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLoc(l);
                            setLocation(
                              [l.name, l.address, l.city].filter(Boolean).join(", "),
                            );
                            setLocPickerOpen(false);
                          }}
                        >
                          Pilih
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
