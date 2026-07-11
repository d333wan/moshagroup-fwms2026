import { useMemo, useState } from "react";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer, FileText, MapPin, CheckSquare, Square } from "lucide-react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loading } from "@/components/common/loading";
import { EmptyState } from "@/components/common/empty-state";
import { listReportsForPrint } from "@/lib/reports.functions";
import { printWithFilename } from "@/lib/print-filename";
import { useAuth } from "@/hooks/use-auth";
import {
  PrintStyles,
  PrintDocHeader,
  PrintDocFooter,
  PrintCover,
  StatusBadge,
} from "@/components/print/print-shell";

const REPORT_TYPES = ["progress", "completion", "issue"] as const;
type ReportType = (typeof REPORT_TYPES)[number];

const TYPE_LABEL: Record<ReportType, string> = {
  progress: "Progres",
  completion: "Selesai",
  issue: "Masalah / Kendala",
};

const TASK_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  assigned: "Ditugaskan",
  in_progress: "Dikerjakan",
  on_hold: "Ditunda",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export const Route = createFileRoute("/_authenticated/dashboard/reports/print")(
  {
    head: () => ({
      meta: [
        { title: "Cetak Laporan · FWMS" },
        { name: "robots", content: "noindex" },
      ],
    }),
    validateSearch: (search: Record<string, unknown>) => ({
      taskId:
        typeof search.taskId === "string" ? (search.taskId as string) : undefined,
    }),
    component: PrintReportsPage,
  },
);

function PrintReportsPage() {
  const { taskId } = useSearch({ from: Route.id });
  const { user } = useAuth();
  const [types, setTypes] = useState<Record<ReportType, boolean>>({
    progress: true,
    completion: true,
    issue: true,
  });
  const [includePhotos, setIncludePhotos] = useState(true);
  const [includeChecklist, setIncludeChecklist] = useState(true);
  const [includeGps, setIncludeGps] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const activeTypes = useMemo(
    () => (Object.keys(types) as ReportType[]).filter((k) => types[k]),
    [types],
  );

  const q = useQuery({
    queryKey: ["print-reports", taskId, activeTypes, from, to],
    queryFn: () =>
      listReportsForPrint({
        data: {
          task_id: taskId ?? null,
          types: activeTypes.length
            ? activeTypes
            : (REPORT_TYPES as unknown as ReportType[]).slice(),
          from: from ? new Date(from).toISOString() : null,
          to: to ? new Date(to + "T23:59:59").toISOString() : null,
        },
      }),
  });

  const groups = q.data?.groups ?? [];
  const total = q.data?.totalReports ?? 0;

  const stats = useMemo(() => {
    const tasks = groups.map((g: any) => g.task);
    const officers = new Set<string>();
    const locations = new Set<string>();
    let completed = 0, inProgress = 0, pending = 0;
    for (const g of groups) {
      const s = g.task?.status;
      if (s === "completed") completed++;
      else if (s === "in_progress") inProgress++;
      else pending++;
      if (g.task?.location_text) locations.add(g.task.location_text);
      for (const r of g.reports ?? []) {
        if (r.reporter?.full_name) officers.add(r.reporter.full_name);
      }
    }
    return {
      totalTasks: tasks.length,
      completed,
      inProgress,
      pending,
      officers: officers.size,
      locations: locations.size,
    };
  }, [groups]);

  const period =
    from || to
      ? `${from ? new Date(from).toLocaleDateString("id-ID") : "—"} s/d ${to ? new Date(to).toLocaleDateString("id-ID") : "—"}`
      : "Semua Periode";
  const generatedBy =
    (user?.user_metadata as any)?.full_name || user?.email || "—";

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "Dashboard", to: "/dashboard" },
        { label: "Cetak Laporan" },
      ]}
    >
      <div className="no-print">
        <PageHeader
          title="Cetak Laporan Lapangan"
          description="Pilih jenis laporan & opsi konten, lalu cetak ke PDF."
          actions={
            <Button
              size="sm"
              onClick={() => printWithFilename("Laporan-Lapangan")}
              disabled={total === 0}
            >
              <Printer className="h-4 w-4" />
              Cetak PDF
            </Button>
          }
        />

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Filter</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div>
              <Label className="mb-2 block text-sm font-medium">
                Jenis Laporan
              </Label>
              <div className="flex flex-wrap gap-4">
                {REPORT_TYPES.map((t) => (
                  <label
                    key={t}
                    className="flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-accent"
                  >
                    <Checkbox
                      checked={types[t]}
                      onCheckedChange={(v) =>
                        setTypes((s) => ({ ...s, [t]: !!v }))
                      }
                    />
                    <span className="text-sm">{TYPE_LABEL[t]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-2 block text-sm font-medium">Sertakan</Label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={includePhotos}
                    onCheckedChange={(v) => setIncludePhotos(!!v)}
                  />
                  Foto lampiran
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={includeChecklist}
                    onCheckedChange={(v) => setIncludeChecklist(!!v)}
                  />
                  Checklist
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={includeGps}
                    onCheckedChange={(v) => setIncludeGps(!!v)}
                  />
                  Koordinat GPS
                </label>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="from" className="mb-2 block text-sm">
                  Dari tanggal
                </Label>
                <Input
                  id="from"
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="to" className="mb-2 block text-sm">
                  Sampai tanggal
                </Label>
                <Input
                  id="to"
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
            </div>

            {taskId ? (
              <p className="text-xs text-muted-foreground">
                Difilter untuk tugas ID: <code>{taskId}</code>
              </p>
            ) : null}
            <p className="text-sm">
              Ditemukan <strong>{total}</strong> laporan pada{" "}
              <strong>{groups.length}</strong> tugas.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Print area */}
      <div className="print-area print-doc">
        <div className="print-page">
          <PrintCover
            title="Laporan Lapangan"
            subtitle="Field Work Management System"
            period={period}
            generatedBy={generatedBy}
            stats={[
              { label: "Total Tugas", value: stats.totalTasks },
              { label: "Selesai", value: stats.completed },
              { label: "Dikerjakan", value: stats.inProgress },
              { label: "Tertunda", value: stats.pending },
              { label: "Petugas", value: stats.officers },
              { label: "Lokasi", value: stats.locations },
            ]}
          />
        </div>

        {q.isLoading ? (
          <div className="no-print">
            <Loading />
          </div>
        ) : total === 0 ? (
          <div className="no-print">
            <EmptyState
              title="Tidak ada laporan"
              description="Sesuaikan filter untuk melihat laporan."
            />
          </div>
        ) : (
          <div className="print-page">
            <PrintDocHeader
              title="Laporan Lapangan"
              subtitle={`${groups.length} tugas · ${total} laporan`}
            />
            {groups.map((g: any, idx: number) => (
              <TaskBlock
                key={g.task.id}
                task={g.task}
                reports={g.reports}
                includePhotos={includePhotos}
                includeChecklist={includeChecklist}
                includeGps={includeGps}
                index={idx + 1}
              />
            ))}
            <PrintDocFooter generatedBy={generatedBy} />
          </div>
        )}
      </div>

      <PrintStyles />
    </DashboardLayout>
  );
}

function TaskBlock({
  task,
  reports,
  includePhotos,
  includeChecklist,
  includeGps,
  index,
}: {
  task: any;
  reports: any[];
  includePhotos: boolean;
  includeChecklist: boolean;
  includeGps: boolean;
  index: number;
}) {
  return (
    <section className="task-block mb-6">
      <div className="print-card mb-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="p-title">
            {index}. {task.title}
          </h2>
          <div className="flex items-center gap-2">
            <StatusBadge
              status={task.status}
              label={TASK_STATUS_LABEL[task.status] ?? task.status}
            />
            <StatusBadge status={task.priority} label={task.priority} />
          </div>
        </div>
        <div
          className="mt-1 grid gap-x-6 gap-y-1"
          style={{
            gridTemplateColumns: "repeat(2, minmax(0,1fr))",
            fontSize: 14,
            color: "#374151",
          }}
        >
          <div>
            <strong style={{ color: "#111827" }}>Jatuh tempo:</strong>{" "}
            {task.due_date
              ? new Date(task.due_date).toLocaleString("id-ID")
              : "—"}
          </div>
          <div>
            <MapPin className="mr-1 inline h-3.5 w-3.5" />
            {task.location_text ?? "—"}
          </div>
        </div>
        {task.description ? (
          <p
            className="mt-2 whitespace-pre-line"
            style={{ color: "#374151", fontSize: 15 }}
          >
            {task.description}
          </p>
        ) : null}
      </div>

      <div className="grid gap-3">
        {reports.map((r: any) => (
          <div key={r.id} className="report-card print-card">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <StatusBadge
                status={
                  r.report_type === "completion"
                    ? "completed"
                    : r.report_type === "issue"
                      ? "cancelled"
                      : "in_progress"
                }
                label={TYPE_LABEL[r.report_type as ReportType] ?? r.report_type}
              />
              <span className="p-caption">
                {new Date(r.reported_at).toLocaleString("id-ID")}
              </span>
              {r.reporter ? (
                <span className="p-caption">
                  · {r.reporter.full_name}
                  {r.reporter.job_title ? ` (${r.reporter.job_title})` : ""}
                </span>
              ) : null}
              {includeGps && r.latitude != null && r.longitude != null ? (
                <span className="p-caption">
                  · 📍 {Number(r.latitude).toFixed(5)},{" "}
                  {Number(r.longitude).toFixed(5)}
                </span>
              ) : null}
            </div>

            {r.narrative ? (
              <p
                className="mb-2 whitespace-pre-line"
                style={{ color: "#1F2937", fontSize: 15, lineHeight: 1.7 }}
              >
                {r.narrative}
              </p>
            ) : (
              <p className="mb-2 italic" style={{ color: "#6B7280" }}>
                (Tanpa narasi)
              </p>
            )}

            {includeChecklist &&
            Array.isArray(r.checklist) &&
            r.checklist.length > 0 ? (
              <div className="mb-2">
                <div
                  className="mb-1"
                  style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}
                >
                  Checklist
                </div>
                <ul className="space-y-1">
                  {r.checklist.map((c: any, i: number) => (
                    <li
                      key={i}
                      className="flex items-center gap-2"
                      style={{ fontSize: 14, color: "#1F2937" }}
                    >
                      {c.done ? (
                        <CheckSquare
                          className="h-4 w-4"
                          style={{ color: "#16A34A" }}
                        />
                      ) : (
                        <Square
                          className="h-4 w-4"
                          style={{ color: "#9CA3AF" }}
                        />
                      )}
                      <span>{c.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {includePhotos && (r.attachments ?? []).length > 0 ? (
              <div>
                <div
                  className="mb-2"
                  style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}
                >
                  <FileText className="mr-1 inline h-3.5 w-3.5" />
                  Lampiran ({r.attachments.length})
                </div>
                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: "repeat(3, minmax(0,1fr))" }}
                >
                  {r.attachments.map((a: any) =>
                    a.url &&
                    (a.kind === "photo" ||
                      a.mime_type?.startsWith("image/")) ? (
                      <div key={a.id} className="print-photo">
                        <div
                          style={{
                            aspectRatio: "4 / 3",
                            width: "100%",
                            overflow: "hidden",
                            borderRadius: 8,
                            border: "1px solid #D1D5DB",
                            background: "#F9FAFB",
                          }}
                        >
                          <img
                            src={a.url}
                            alt={a.file_name}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                            crossOrigin="anonymous"
                          />
                        </div>
                        <div
                          className="mt-1 truncate"
                          style={{ fontSize: 11, color: "#6B7280" }}
                        >
                          {a.file_name}
                        </div>
                      </div>
                    ) : (
                      <div
                        key={a.id}
                        className="rounded border p-2"
                        style={{
                          fontSize: 12,
                          color: "#374151",
                          borderColor: "#D1D5DB",
                        }}
                      >
                        {a.file_name}
                      </div>
                    ),
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
