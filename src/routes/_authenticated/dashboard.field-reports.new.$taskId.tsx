import { useMemo, useState } from "react";
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Phone, MessageCircle, AlertTriangle } from "lucide-react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  WatermarkCamera,
  type WatermarkedFile,
} from "@/components/field/watermark-camera";
import { supabase } from "@/integrations/supabase/client";
import { getTask } from "@/lib/tasks.functions";
import {
  saveFieldReport,
  FIELD_WORK_STATUS_LABEL,
  FIELD_WORK_STATUS_VALUES,
} from "@/lib/field-reports.functions";
import { useAuth } from "@/hooks/use-auth";
import { AttachmentsPanel } from "@/components/common/attachments-panel";

export const Route = createFileRoute(
  "/_authenticated/dashboard/field-reports/new/$taskId",
)({
  head: () => ({
    meta: [
      { title: "Buat Laporan Lapangan · FWMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewFieldReportPage,
});

type PhotoBucket = {
  selfie: WatermarkedFile[];
  location: WatermarkedFile[];
  physical: WatermarkedFile[];
  gps: WatermarkedFile[];
  vehicle: WatermarkedFile[];
  obstacle: WatermarkedFile[];
};

function NewFieldReportPage() {
  const { taskId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const taskQ = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => getTask({ data: { id: taskId } }),
  });

  const task = taskQ.data?.task as any;

  // Form state
  const [gpsSource, setGpsSource] = useState<"device" | "external">("device");
  const [lat, setLat] = useState<string>("");
  const [lon, setLon] = useState<string>("");
  const [accuracy, setAccuracy] = useState<string>("");
  const [workStatus, setWorkStatus] = useState<string>("in_progress");
  const [progress, setProgress] = useState<number>(20);
  const [description, setDescription] = useState("");
  const [hasObstacle, setHasObstacle] = useState(false);
  const [obstacleDesc, setObstacleDesc] = useState("");
  const [assistance, setAssistance] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [gettingGps, setGettingGps] = useState(false);

  const [photos, setPhotos] = useState<PhotoBucket>({
    selfie: [],
    location: [],
    physical: [],
    gps: [],
    vehicle: [],
    obstacle: [],
  });

  // Default vehicle from task
  useMemo(() => {
    if (task && !vehicleType && task.default_vehicle_type) {
      setVehicleType(task.default_vehicle_type);
      setLicensePlate(task.default_license_plate ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task]);

  async function pickGps() {
    if (!("geolocation" in navigator)) {
      toast.error("Perangkat tidak mendukung GPS");
      return;
    }
    setGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLat(String(p.coords.latitude));
        setLon(String(p.coords.longitude));
        setAccuracy(String(Math.round(p.coords.accuracy)));
        setGpsSource("device");
        setGettingGps(false);
        toast.success("GPS diambil");
      },
      (e) => {
        setGettingGps(false);
        toast.error("Gagal ambil GPS: " + e.message);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const submit = useMutation({
    mutationFn: async (asDraft: boolean) => {
      if (!user) throw new Error("Belum login");
      if (!asDraft) {
        if (photos.selfie.length === 0)
          throw new Error("Foto selfie petugas wajib");
        if (photos.location.length === 0)
          throw new Error("Foto lokasi wajib");
        if (!lat || !lon) throw new Error("Koordinat GPS wajib");
      }

      const uploaded: any[] = [];
      const uploadBucket = async (arr: WatermarkedFile[], type: string) => {
        for (const pf of arr) {
          const ext = (pf.file.name.split(".").pop() ?? "jpg").toLowerCase();
          const path = `${user.id}/${taskId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
          const { error } = await supabase.storage
            .from("field-reports")
            .upload(path, pf.file, {
              contentType: pf.file.type || "image/jpeg",
              upsert: false,
            });
          if (error)
            throw new Error(`Gagal upload ${pf.file.name}: ${error.message}`);
          uploaded.push({
            photo_type: type,
            storage_path: path,
            capture_source: "camera",
            latitude: pf.lat,
            longitude: pf.lon,
            captured_at: pf.takenAt,
          });
        }
      };
      await uploadBucket(photos.selfie, "officer_selfie");
      await uploadBucket(photos.location, "location");
      await uploadBucket(photos.physical.slice(0, 4), "physical_condition");
      await uploadBucket(photos.gps, "gps_evidence");
      await uploadBucket(photos.vehicle, "vehicle");
      await uploadBucket(photos.obstacle, "obstacle");

      return saveFieldReport({
        data: {
          task_id: taskId,
          latitude: lat ? Number(lat) : null,
          longitude: lon ? Number(lon) : null,
          gps_accuracy: accuracy ? Number(accuracy) : null,
          gps_source: gpsSource,
          progress_percent: progress,
          work_status: workStatus as any,
          work_description: description || null,
          has_obstacle: hasObstacle,
          obstacle_description: hasObstacle ? obstacleDesc || null : null,
          assistance_needed: hasObstacle ? assistance || null : null,
          vehicle_type: vehicleType || null,
          license_plate: licensePlate || null,
          photos: uploaded,
          submit: !asDraft,
        },
      });
    },
    onSuccess: (res: any, asDraft) => {
      toast.success(asDraft ? "Draft disimpan" : "Laporan terkirim");
      navigate({
        to: "/dashboard/field-reports/$reportId",
        params: { reportId: res.id },
      });
    },
    onError: (e: any) => toast.error(e?.message ?? "Gagal simpan laporan"),
  });

  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;
  if (taskQ.isLoading) return null;
  if (!task)
    return (
      <DashboardLayout>
        <p>Tugas tidak ditemukan</p>
      </DashboardLayout>
    );

  const officerName =
    (user.user_metadata?.full_name as string) ?? user.email ?? null;

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "Dashboard", to: "/dashboard" },
        { label: "Laporan Lapangan", to: "/dashboard/field-reports" },
        { label: "Buat" },
      ]}
    >
      <PageHeader
        title="Buat Laporan Lapangan"
        description={`Tugas: ${task.title}`}
        actions={
          <Button variant="outline" size="sm" onClick={() => history.back()}>
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Button>
        }
      />

      {/* Task info + Supervisor */}
      <Card className="mb-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Informasi Penugasan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <Info label="Pekerjaan" value={task.title} />
          <Info label="Lokasi" value={task.location_text ?? "—"} />
          <Info label="Radius toleransi" value={`${task.radius_meters ?? 100} m`} />
          <Info label="Petugas" value={officerName ?? "—"} />
          {task.supervisor_person_name ? (
            <Info
              label={`Supervisor ${task.supervisor_company_name ?? ""}`}
              value={
                <span className="flex flex-wrap items-center gap-2">
                  {task.supervisor_person_name}
                  {task.supervisor_phone ? (
                    <a href={`tel:${task.supervisor_phone}`}>
                      <Button size="sm" variant="outline">
                        <Phone className="h-3 w-3" /> Telepon
                      </Button>
                    </a>
                  ) : null}
                  {task.supervisor_whatsapp ? (
                    <a
                      href={`https://wa.me/${task.supervisor_whatsapp.replace(/[^\d]/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button size="sm" variant="outline">
                        <MessageCircle className="h-3 w-3" /> WA
                      </Button>
                    </a>
                  ) : null}
                </span>
              }
            />
          ) : null}
          {task.emergency_contact_primary ? (
            <Info
              label="Kontak Darurat"
              value={
                <a href={`tel:${task.emergency_contact_primary}`}>
                  <Button size="sm" variant="destructive">
                    <Phone className="h-3 w-3" /> {task.emergency_contact_primary}
                  </Button>
                </a>
              }
            />
          ) : null}
        </CardContent>
      </Card>

      {/* Surat tugas & dokumen lokasi (read-only) */}
      <Card className="mb-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Surat Tugas & Dokumen</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <AttachmentsPanel
            scope="task"
            parentId={taskId}
            canUpload={false}
            canDelete={false}
            title="Dokumen Penugasan"
            emptyText="Tidak ada dokumen penugasan."
          />
          {task.location_id ? (
            <AttachmentsPanel
              scope="location"
              parentId={task.location_id}
              canUpload={false}
              canDelete={false}
              title="Dokumen Lokasi"
              emptyText="Tidak ada dokumen lokasi."
            />
          ) : null}
          <p className="text-xs text-muted-foreground">
            Setelah menyimpan laporan, buka detail untuk mengunggah hingga 4
            dokumen PDF pendukung.
          </p>
        </CardContent>
      </Card>


      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate(false);
        }}
      >
        {/* Step A: Kehadiran & Lokasi */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">A. Kehadiran & Lokasi (GPS)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={pickGps} disabled={gettingGps}>
                <MapPin className="h-4 w-4" />
                {gettingGps ? "Mengambil…" : "Ambil GPS Perangkat"}
              </Button>
              <Select value={gpsSource} onValueChange={(v) => setGpsSource(v as any)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="device">GPS Perangkat</SelectItem>
                  <SelectItem value="external">GPS Eksternal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div>
                <Label>Latitude</Label>
                <Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-6.200000" />
              </div>
              <div>
                <Label>Longitude</Label>
                <Input value={lon} onChange={(e) => setLon(e.target.value)} placeholder="106.816666" />
              </div>
              <div>
                <Label>Akurasi (m)</Label>
                <Input value={accuracy} onChange={(e) => setAccuracy(e.target.value)} />
              </div>
            </div>
            {gpsSource === "external" ? (
              <div>
                <Label>Foto Bukti GPS Eksternal</Label>
                <WatermarkCamera
                  officerName={officerName}
                  files={photos.gps}
                  onChange={(f) => setPhotos({ ...photos, gps: f })}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Step B: Dokumentasi */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">B. Dokumentasi Lapangan</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <Label>Foto Wajah Petugas (selfie di lokasi) — wajib</Label>
              <WatermarkCamera
                officerName={officerName}
                files={photos.selfie}
                onChange={(f) => setPhotos({ ...photos, selfie: f })}
              />
            </div>
            <div>
              <Label>Foto Lokasi — wajib</Label>
              <WatermarkCamera
                officerName={officerName}
                files={photos.location}
                onChange={(f) => setPhotos({ ...photos, location: f })}
              />
            </div>
            <div>
              <Label>Foto Kondisi Fisik (maks. 4)</Label>
              <WatermarkCamera
                officerName={officerName}
                files={photos.physical.slice(0, 4)}
                onChange={(f) => setPhotos({ ...photos, physical: f.slice(0, 4) })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Step C: Progres & Kendala */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">C. Progres & Kendala</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label>Status Pekerjaan</Label>
                <Select value={workStatus} onValueChange={setWorkStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_WORK_STATUS_VALUES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {FIELD_WORK_STATUS_LABEL[v]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Progres (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={workStatus === "completed" ? 100 : progress}
                  onChange={(e) => setProgress(Number(e.target.value) || 0)}
                  disabled={workStatus === "completed"}
                />
              </div>
            </div>
            <div>
              <Label>Uraian singkat pekerjaan (maks. 500)</Label>
              <Textarea
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="obs"
                checked={hasObstacle}
                onCheckedChange={(v) => setHasObstacle(!!v)}
              />
              <Label htmlFor="obs" className="cursor-pointer">
                <AlertTriangle className="mr-1 inline h-4 w-4 text-amber-500" />
                Ada kendala di lapangan
              </Label>
            </div>
            {hasObstacle ? (
              <>
                <div>
                  <Label>Penjelasan kendala</Label>
                  <Textarea
                    value={obstacleDesc}
                    onChange={(e) => setObstacleDesc(e.target.value)}
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Bantuan yang dibutuhkan</Label>
                  <Textarea
                    value={assistance}
                    onChange={(e) => setAssistance(e.target.value)}
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Foto Kendala (opsional)</Label>
                  <WatermarkCamera
                    officerName={officerName}
                    files={photos.obstacle}
                    onChange={(f) => setPhotos({ ...photos, obstacle: f })}
                  />
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        {/* Kendaraan (opsional) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Kendaraan (opsional)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Jenis Kendaraan</Label>
              <Input value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} />
            </div>
            <div>
              <Label>Nomor Plat</Label>
              <Input value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Foto Kendaraan (opsional)</Label>
              <WatermarkCamera
                officerName={officerName}
                files={photos.vehicle}
                onChange={(f) => setPhotos({ ...photos, vehicle: f })}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={submit.isPending}
            onClick={() => submit.mutate(true)}
          >
            Simpan Draft
          </Button>
          <Button type="submit" disabled={submit.isPending}>
            {submit.isPending ? "Mengirim…" : "Kirim Laporan"}
          </Button>
        </div>
      </form>
    </DashboardLayout>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
