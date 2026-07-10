import { useMemo, useState } from "react";
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Upload, X } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { createReport } from "@/lib/reports.functions";
import { useAuth } from "@/hooks/use-auth";

const REPORT_TYPE_OPTIONS = [
  { value: "progress", label: "Progres" },
  { value: "completion", label: "Selesai" },
  { value: "issue", label: "Masalah / Kendala" },
];

export const Route = createFileRoute(
  "/_authenticated/dashboard/tasks/$taskId/reports/new",
)({
  head: () => ({
    meta: [
      { title: "Laporan Baru · FWMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewReportPage,
});

type PendingFile = { file: File; localUrl: string };

function NewReportPage() {
  const { taskId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [reportType, setReportType] = useState("progress");
  const [narrative, setNarrative] = useState("");
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [gps, setGps] = useState<{ lat: number; lon: number } | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);

  const previews = useMemo(() => files, [files]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Belum login");
      // Upload all files first
      const uploaded: {
        storage_path: string;
        file_name: string;
        mime_type: string | null;
        size_bytes: number | null;
        kind: "photo" | "document";
      }[] = [];
      for (const pf of files) {
        const ext = pf.file.name.split(".").pop() ?? "bin";
        const path = `${taskId}/${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("task-reports")
          .upload(path, pf.file, {
            contentType: pf.file.type || undefined,
            upsert: false,
          });
        if (error) throw new Error(`Gagal unggah ${pf.file.name}: ${error.message}`);
        uploaded.push({
          storage_path: path,
          file_name: pf.file.name,
          mime_type: pf.file.type || null,
          size_bytes: pf.file.size,
          kind: pf.file.type.startsWith("image/") ? "photo" : "document",
        });
      }
      return createReport({
        data: {
          task_id: taskId,
          report_type: reportType as any,
          narrative: narrative || null,
          checklist: [],
          latitude: gps?.lat ?? null,
          longitude: gps?.lon ?? null,
          attachments: uploaded,
        },
      });
    },
    onSuccess: () => {
      toast.success("Laporan berhasil dikirim");
      navigate({ to: "/dashboard/tasks/$taskId", params: { taskId } });
    },
    onError: (e: any) => toast.error(e?.message ?? "Gagal kirim laporan"),
  });

  const captureGps = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Perangkat tidak mendukung geolokasi");
      return;
    }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setGpsBusy(false);
        toast.success("Koordinat GPS diambil");
      },
      (err) => {
        setGpsBusy(false);
        toast.error(err.message || "Gagal ambil GPS");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "Dashboard", to: "/dashboard" },
        { label: "Penugasan", to: "/dashboard/tasks" },
        { label: "Laporan" },
      ]}
    >
      <PageHeader
        title="Buat Laporan Lapangan"
        description="Kirim update, foto bukti, dan koordinat lokasi."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              navigate({ to: "/dashboard/tasks/$taskId", params: { taskId } })
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
            className="grid gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              submit.mutate();
            }}
          >
            <div className="grid gap-2">
              <Label>Jenis Laporan</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="nar">Narasi</Label>
              <Textarea
                id="nar"
                value={narrative}
                onChange={(e) => setNarrative(e.target.value)}
                rows={5}
                placeholder="Deskripsikan pekerjaan yang dilakukan, hasil, atau kendala."
              />
            </div>

            <div className="grid gap-2">
              <Label>Foto / Lampiran</Label>
              <div className="rounded-md border border-dashed p-4">
                <div className="flex items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-accent">
                    <Upload className="h-4 w-4" />
                    Pilih file
                    <Input
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const list = Array.from(e.target.files ?? []);
                        setFiles((prev) => [
                          ...prev,
                          ...list.map((f) => ({
                            file: f,
                            localUrl: URL.createObjectURL(f),
                          })),
                        ]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <span className="text-xs text-muted-foreground">
                    {files.length} file dipilih
                  </span>
                </div>
                {previews.length > 0 ? (
                  <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {previews.map((pf, idx) => (
                      <div
                        key={idx}
                        className="group relative overflow-hidden rounded-md border bg-muted"
                      >
                        {pf.file.type.startsWith("image/") ? (
                          <img
                            src={pf.localUrl}
                            alt={pf.file.name}
                            className="h-24 w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-24 items-center justify-center px-2 text-center text-xs">
                            {pf.file.name}
                          </div>
                        )}
                        <button
                          type="button"
                          className="absolute right-1 top-1 rounded-full bg-background/80 p-1 opacity-0 transition group-hover:opacity-100"
                          onClick={() =>
                            setFiles((prev) => prev.filter((_, i) => i !== idx))
                          }
                          aria-label="Hapus"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Koordinat GPS</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={captureGps}
                  disabled={gpsBusy}
                >
                  {gpsBusy ? "Mengambil…" : "Ambil GPS"}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {gps
                    ? `${gps.lat.toFixed(5)}, ${gps.lon.toFixed(5)}`
                    : "Belum diambil"}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  navigate({ to: "/dashboard/tasks/$taskId", params: { taskId } })
                }
              >
                Batal
              </Button>
              <Button type="submit" disabled={submit.isPending}>
                {submit.isPending ? "Mengirim…" : "Kirim Laporan"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
