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
import {
  COMPANY_ADDRESS,
  COMPANY_LOGO_URL,
  COMPANY_NAME,
} from "@/lib/company";

const REPORT_TYPES = ["progress", "completion", "issue"] as const;
type ReportType = (typeof REPORT_TYPES)[number];

const TYPE_LABEL: Record<ReportType, string> = {
  progress: "Progres",
  completion: "Selesai",
  issue: "Masalah / Kendala",
};

const searchSchema = z.object({
  taskId: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/dashboard/reports/print")(
  {
    head: () => ({
      meta: [
        { title: "Cetak Laporan · FWMS" },
        { name: "robots", content: "noindex" },
      ],
    }),
    validateSearch: zodValidator(searchSchema),
    component: PrintReportsPage,
  },
);

function PrintReportsPage() {
  const { taskId } = useSearch({ from: Route.id });
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
    () =>
      (Object.keys(types) as ReportType[]).filter((k) => types[k]),
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
              onClick={() => window.print()}
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
              <Label className="mb-2 block text-sm font-medium">
                Sertakan
              </Label>
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
      <div className="print-area">
        <PrintHeader />
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
          groups.map((g: any) => (
            <TaskBlock
              key={g.task.id}
              task={g.task}
              reports={g.reports}
              includePhotos={includePhotos}
              includeChecklist={includeChecklist}
              includeGps={includeGps}
            />
          ))
        )}
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          body { background: white !important; }
          .no-print, [data-sidebar], header { display: none !important; }
          main { padding: 0 !important; }
          .print-area { display: block !important; }
          .task-block { break-before: page; }
          .task-block:first-child { break-before: auto; }
          .report-card { break-inside: avoid; }
          .print-photo { break-inside: avoid; }
        }
      `}</style>
    </DashboardLayout>
  );
}

function PrintHeader() {
  return (
    <div className="mb-6 hidden items-start justify-between border-b pb-4 print:flex">
      <div className="flex items-center gap-3">
        <img
          src={COMPANY_LOGO_URL}
          alt="Logo"
          className="h-12 w-auto"
          crossOrigin="anonymous"
        />
        <div>
          <div className="text-base font-bold">{COMPANY_NAME}</div>
          <div className="text-xs text-muted-foreground">
            {COMPANY_ADDRESS}
          </div>
        </div>
      </div>
      <div className="text-right text-xs">
        <div className="font-semibold">Laporan Lapangan</div>
        <div>
          Dicetak: {new Date().toLocaleString("id-ID")}
        </div>
      </div>
    </div>
  );
}

function TaskBlock({
  task,
  reports,
  includePhotos,
  includeChecklist,
  includeGps,
}: {
  task: any;
  reports: any[];
  includePhotos: boolean;
  includeChecklist: boolean;
  includeGps: boolean;
}) {
  return (
    <section className="task-block mb-8">
      <div className="mb-3 rounded-md border bg-muted/40 p-3">
        <h2 className="text-lg font-bold">{task.title}</h2>
        <div className="mt-1 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
          <div>
            <strong>Status:</strong> {task.status}
          </div>
          <div>
            <strong>Prioritas:</strong> {task.priority}
          </div>
          <div>
            <strong>Jatuh tempo:</strong>{" "}
            {task.due_date
              ? new Date(task.due_date).toLocaleString("id-ID")
              : "—"}
          </div>
          <div>
            <MapPin className="mr-1 inline h-3 w-3" />
            {task.location_text ?? "—"}
          </div>
        </div>
        {task.description ? (
          <p className="mt-2 whitespace-pre-line text-xs">{task.description}</p>
        ) : null}
      </div>

      <div className="grid gap-3">
        {reports.map((r: any) => (
          <div
            key={r.id}
            className="report-card rounded-md border p-3 text-sm"
          >
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded bg-primary/10 px-2 py-0.5 font-semibold uppercase text-primary">
                {TYPE_LABEL[r.report_type as ReportType] ?? r.report_type}
              </span>
              <span className="text-muted-foreground">
                {new Date(r.reported_at).toLocaleString("id-ID")}
              </span>
              {r.reporter ? (
                <span className="text-muted-foreground">
                  · {r.reporter.full_name}
                  {r.reporter.job_title ? ` (${r.reporter.job_title})` : ""}
                </span>
              ) : null}
              {includeGps && r.latitude != null && r.longitude != null ? (
                <span className="text-muted-foreground">
                  · 📍 {Number(r.latitude).toFixed(5)},{" "}
                  {Number(r.longitude).toFixed(5)}
                </span>
              ) : null}
            </div>

            {r.narrative ? (
              <p className="mb-2 whitespace-pre-line">{r.narrative}</p>
            ) : (
              <p className="mb-2 italic text-muted-foreground">
                (Tanpa narasi)
              </p>
            )}

            {includeChecklist && Array.isArray(r.checklist) && r.checklist.length > 0 ? (
              <div className="mb-2">
                <div className="mb-1 text-xs font-semibold">Checklist</div>
                <ul className="space-y-1">
                  {r.checklist.map((c: any, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-xs">
                      {c.done ? (
                        <CheckSquare className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <Square className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span>{c.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {includePhotos && (r.attachments ?? []).length > 0 ? (
              <div>
                <div className="mb-1 text-xs font-semibold">
                  <FileText className="mr-1 inline h-3 w-3" />
                  Lampiran ({r.attachments.length})
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {r.attachments.map((a: any) =>
                    a.url && (a.kind === "photo" || a.mime_type?.startsWith("image/")) ? (
                      <div key={a.id} className="print-photo">
                        <img
                          src={a.url}
                          alt={a.file_name}
                          className="h-40 w-full rounded border object-cover"
                          crossOrigin="anonymous"
                        />
                        <div className="mt-1 truncate text-[10px] text-muted-foreground">
                          {a.file_name}
                        </div>
                      </div>
                    ) : (
                      <div
                        key={a.id}
                        className="rounded border p-2 text-[10px]"
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
