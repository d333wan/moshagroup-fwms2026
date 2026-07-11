import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
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
import { Loading } from "@/components/common/loading";
import { getOfficer, upsertOfficer } from "@/lib/officers.functions";
import { listLocations } from "@/lib/locations.functions";
import { useAuth } from "@/hooks/use-auth";

const STATUS_OPTIONS = [
  { value: "available", label: "Tersedia" },
  { value: "on_duty", label: "Bertugas" },
  { value: "off_duty", label: "Libur" },
  { value: "leave", label: "Cuti" },
];

export const Route = createFileRoute(
  "/_authenticated/dashboard/officers/$userId",
)({
  head: () => ({
    meta: [
      { title: "Ubah Petugas · FWMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OfficerEditPage,
});

function OfficerEditPage() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, isAdminTier, isManager, loading } = useAuth();
  const canManage = isAdminTier || isManager;
  const isSelf = user?.id === userId;

  const q = useQuery({
    queryKey: ["officer", userId],
    queryFn: () => getOfficer({ data: { user_id: userId } }),
  });
  const locs = useQuery({
    queryKey: ["locations"],
    queryFn: () => listLocations(),
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [department, setDepartment] = useState("");
  const [skills, setSkills] = useState("");
  const [baseLoc, setBaseLoc] = useState<string>("none");
  const [status, setStatus] = useState("available");
  const [notes, setNotes] = useState("");
  const [nik, setNik] = useState("");
  const [address, setAddress] = useState("");


  useEffect(() => {
    if (!q.data) return;
    const p = q.data.profile;
    const o = q.data.officer;
    setFullName(p.full_name ?? "");
    setPhone(p.phone ?? "");
    setJobTitle(p.job_title ?? "");
    setEmployeeId(p.employee_id ?? "");
    setNik((p as any).nik ?? "");
    setAddress((p as any).address ?? "");
    setDepartment(o?.department ?? "");
    setSkills((o?.skills ?? []).join(", "));
    setBaseLoc(o?.base_location_id ?? "none");
    setStatus(o?.status ?? "available");
    setNotes(o?.notes ?? "");

  }, [q.data]);

  const save = useMutation({
    mutationFn: () =>
      upsertOfficer({
        data: {
          user_id: userId,
          full_name: fullName || undefined,
          phone: phone || null,
          job_title: jobTitle || null,
          employee_id: employeeId || null,
          department: department || null,
          skills: skills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          base_location_id: baseLoc === "none" ? null : baseLoc,
          status: status as any,
          notes: notes || null,
        },
      }),
    onSuccess: () => {
      toast.success("Data petugas disimpan");
      qc.invalidateQueries({ queryKey: ["officers"] });
      qc.invalidateQueries({ queryKey: ["officer", userId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Gagal simpan"),
  });

  if (loading) return null;
  if (!canManage && !isSelf) return <Navigate to="/dashboard" />;

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "Dashboard", to: "/dashboard" },
        { label: "Petugas Lapangan", to: "/dashboard/officers" },
        { label: fullName || "Ubah" },
      ]}
    >
      <PageHeader
        title="Data Petugas"
        description="Isi jabatan, nomor handphone, dan detail operasional lainnya."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: "/dashboard/officers" })}
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Button>
        }
      />

      {q.isLoading ? (
        <Loading />
      ) : (
        <Card>
          <CardContent className="p-4 sm:p-6">
            <form
              className="grid gap-5"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate();
              }}
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="fn">Nama Lengkap</Label>
                  <Input
                    id="fn"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="eid">NIP / ID Pegawai</Label>
                  <Input
                    id="eid"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="opsional"
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="jt">Jabatan</Label>
                  <Input
                    id="jt"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="mis. Teknisi Senior"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ph">No. Handphone</Label>
                  <Input
                    id="ph"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="mis. 0812xxxxxxx"
                    inputMode="tel"
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="dep">Departemen / Unit</Label>
                  <Input
                    id="dep"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Status Ketersediaan</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Lokasi Utama</Label>
                <Select value={baseLoc} onValueChange={setBaseLoc}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih lokasi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tidak ada</SelectItem>
                    {(locs.data ?? []).map((l: any) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sk">Keahlian (pisahkan koma)</Label>
                <Input
                  id="sk"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="instalasi, survei, elektrikal"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="nt">Catatan</Label>
                <Textarea
                  id="nt"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate({ to: "/dashboard/officers" })}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={save.isPending}>
                  {save.isPending ? "Menyimpan…" : "Simpan"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
