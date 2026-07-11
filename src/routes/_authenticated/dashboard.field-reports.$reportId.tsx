import { useState } from "react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, MapPin, MessageSquare } from "lucide-react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import {
  getFieldReport,
  addFieldReportComment,
  verifyFieldReport,
  FIELD_REPORT_STATUS_LABEL,
  FIELD_WORK_STATUS_LABEL,
} from "@/lib/field-reports.functions";
import { AttachmentsPanel } from "@/components/common/attachments-panel";

export const Route = createFileRoute(
  "/_authenticated/dashboard/field-reports/$reportId",
)({
  head: () => ({
    meta: [
      { title: "Detail Laporan · FWMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FieldReportDetailPage,
});

function FieldReportDetailPage() {
  const { reportId } = Route.useParams();
  const { user, loading, isAdminTier } = useAuth();
  const qc = useQueryClient();
  const [msg, setMsg] = useState("");
  const [note, setNote] = useState("");

  const q = useQuery({
    queryKey: ["field-report", reportId],
    queryFn: () => getFieldReport({ data: { id: reportId } }),
    enabled: !!user,
  });

  const comment = useMutation({
    mutationFn: () =>
      addFieldReportComment({ data: { report_id: reportId, message: msg } }),
    onSuccess: () => {
      setMsg("");
      qc.invalidateQueries({ queryKey: ["field-report", reportId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Gagal kirim"),
  });

  const verify = useMutation({
    mutationFn: (action: "approve" | "reject" | "needs_revision") =>
      verifyFieldReport({
        data: { id: reportId, action, note: note || null },
      }),
    onSuccess: () => {
      setNote("");
      qc.invalidateQueries({ queryKey: ["field-report", reportId] });
      toast.success("Status diperbarui");
    },
    onError: (e: any) => toast.error(e?.message ?? "Gagal update"),
  });

  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;
  if (q.isLoading || !q.data) return null;

  const { report, photos, comments, task, officer, location } = q.data as any;
  const canEdit =
    report.officer_id === user.id &&
    (report.status === "draft" || report.status === "needs_revision");

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "Dashboard", to: "/dashboard" },
        { label: "Laporan Lapangan", to: "/dashboard/field-reports" },
        { label: report.report_number },
      ]}
    >
      <PageHeader
        title={report.report_number}
        description={task?.title}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => history.back()}>
              <ArrowLeft className="h-4 w-4" /> Kembali
            </Button>
            {canEdit ? (
              <Link
                to="/dashboard/field-reports/new/$taskId"
                params={{ taskId: report.task_id }}
              >
                <Button size="sm">Lanjutkan / Ubah</Button>
              </Link>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ringkasan</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            <Info label="Status" value={<Badge>{FIELD_REPORT_STATUS_LABEL[report.status as keyof typeof FIELD_REPORT_STATUS_LABEL]}</Badge>} />
            <Info label="Status Kerja" value={FIELD_WORK_STATUS_LABEL[report.work_status as keyof typeof FIELD_WORK_STATUS_LABEL]} />
            <Info label="Progres" value={`${report.progress_percent}%`} />
            <Info label="Tanggal & Jam" value={`${report.report_date} ${String(report.report_time ?? "").slice(0, 5)}`} />
            <Info
              label="GPS"
              value={
                report.latitude != null
                  ? `${Number(report.latitude).toFixed(5)}, ${Number(report.longitude).toFixed(5)} (${report.gps_source})`
                  : "—"
              }
            />
            <Info
              label="Akurasi / Jarak"
              value={`${report.gps_accuracy ?? "—"} m / ${report.distance_from_target ?? "—"} m`}
            />
            <Info
              label="Radius"
              value={
                report.within_radius == null
                  ? "—"
                  : report.within_radius
                    ? <Badge variant="secondary">Di dalam radius</Badge>
                    : <Badge variant="destructive">Di luar radius</Badge>
              }
            />
            <Info label="Petugas" value={officer?.full_name ?? "—"} />
            <Info label="Kendaraan" value={report.vehicle_type ? `${report.vehicle_type} · ${report.license_plate ?? "-"}` : "—"} />
            <Info label="Uraian" value={<div className="whitespace-pre-wrap">{report.work_description ?? "—"}</div>} />
            {report.has_obstacle ? (
              <>
                <Info label="Kendala" value={<div className="whitespace-pre-wrap">{report.obstacle_description ?? "—"}</div>} />
                <Info label="Bantuan diminta" value={<div className="whitespace-pre-wrap">{report.assistance_needed ?? "—"}</div>} />
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Lokasi Tugas</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                {location?.name ?? task?.location_text ?? "—"}
                {location?.address ? <div className="text-xs text-muted-foreground">{location.address}</div> : null}
                {location?.latitude != null ? (
                  <div className="text-xs text-muted-foreground">
                    {Number(location.latitude).toFixed(5)}, {Number(location.longitude).toFixed(5)}
                  </div>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Foto Bukti</CardTitle>
        </CardHeader>
        <CardContent>
          {photos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada foto.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {photos.map((p: any) => (
                <a
                  key={p.id}
                  href={p.url ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="group block overflow-hidden rounded border bg-muted"
                >
                  {p.url ? (
                    <img src={p.url} alt={p.photo_type} className="h-32 w-full object-cover" />
                  ) : (
                    <div className="h-32" />
                  )}
                  <div className="px-2 py-1 text-[10px] text-muted-foreground">
                    {p.photo_type}
                    {p.direction_label ? ` · ${p.direction_label}` : ""}
                  </div>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Dokumen Petugas (PDF)</CardTitle>
          </CardHeader>
          <CardContent>
            <AttachmentsPanel
              scope="report"
              parentId={reportId}
              canUpload={canEdit}
              canDelete={canEdit || isAdminTier}
              emptyText="Belum ada PDF diunggah."
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Surat Tugas & Lokasi</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <AttachmentsPanel
              scope="task"
              parentId={report.task_id}
              canUpload={false}
              canDelete={false}
              title="Dokumen Penugasan"
              emptyText="Tidak ada."
            />
            {task?.location_id ? (
              <AttachmentsPanel
                scope="location"
                parentId={task.location_id}
                canUpload={false}
                canDelete={false}
                title="Dokumen Lokasi"
                emptyText="Tidak ada."
              />
            ) : null}
          </CardContent>
        </Card>
      </div>


      {isAdminTier && report.status !== "approved" ? (
        <Card className="mt-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Verifikasi Admin</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Textarea
              placeholder="Catatan verifikasi (opsional untuk approve, dianjurkan untuk revisi/tolak)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => verify.mutate("approve")} disabled={verify.isPending}>
                Setujui
              </Button>
              <Button size="sm" variant="secondary" onClick={() => verify.mutate("needs_revision")} disabled={verify.isPending}>
                Minta Revisi
              </Button>
              <Button size="sm" variant="destructive" onClick={() => verify.mutate("reject")} disabled={verify.isPending}>
                Tolak
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            <MessageSquare className="mr-1 inline h-4 w-4" /> Komentar
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada komentar.</p>
          ) : (
            <div className="grid gap-2">
              {comments.map((c: any) => (
                <div key={c.id} className="rounded border p-2 text-sm">
                  <div className="text-xs text-muted-foreground">
                    {c.sender?.full_name ?? "—"} · {new Date(c.created_at).toLocaleString("id-ID")}
                  </div>
                  <div className="whitespace-pre-wrap">{c.message}</div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Textarea
              placeholder="Tulis komentar…"
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              rows={2}
            />
            <Button
              size="sm"
              onClick={() => msg.trim() && comment.mutate()}
              disabled={comment.isPending || !msg.trim()}
            >
              Kirim
            </Button>
          </div>
        </CardContent>
      </Card>
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
