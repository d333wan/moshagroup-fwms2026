import { useState } from "react";
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

function NewReportPage() {
  const { taskId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [reportType, setReportType] = useState("progress");
  const [narrative, setNarrative] = useState("");
  const [files, setFiles] = useState<WatermarkedFile[]>([]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Belum login");
      const uploaded: {
        storage_path: string;
        file_name: string;
        mime_type: string | null;
        size_bytes: number | null;
        kind: "photo" | "document";
      }[] = [];
      // Use first attached file's GPS as report location if available
      let reportLat: number | null = null;
      let reportLon: number | null = null;
      for (const pf of files) {
        if (reportLat == null && pf.lat != null) {
          reportLat = pf.lat;
          reportLon = pf.lon;
        }
        const ext = pf.file.name.split(".").pop() ?? "bin";
        const path = `${taskId}/${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("task-reports")
          .upload(path, pf.file, {
            contentType: pf.file.type || undefined,
            upsert: false,
          });
        if (error)
          throw new Error(`Gagal unggah ${pf.file.name}: ${error.message}`);
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
          latitude: reportLat,
          longitude: reportLon,
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

  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;

  const officerName =
    (user.user_metadata?.full_name as string | undefined) ?? user.email ?? null;

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
        description="Foto otomatis diberi watermark tanggal, jam & koordinat GPS."
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
              <WatermarkCamera
                officerName={officerName}
                files={files}
                onChange={setFiles}
              />
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
