import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer, Search } from "lucide-react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loading } from "@/components/common/loading";
import { EmptyState } from "@/components/common/empty-state";
import { listAssignmentsForPrint } from "@/lib/tasks.functions";
import { printWithFilename } from "@/lib/print-filename";
import { useAuth } from "@/hooks/use-auth";
import {
  PrintStyles,
  PrintDocHeader,
  PrintDocFooter,
  PrintCover,
  StatusBadge,
} from "@/components/print/print-shell";
import {
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  TASK_PRIORITY_VALUES,
  TASK_STATUS_VALUES,
} from "@/components/tasks/task-badges";

export const Route = createFileRoute("/_authenticated/dashboard/tasks/print")({
  head: () => ({
    meta: [
      { title: "Cetak Laporan Penugasan · FWMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PrintAssignmentsPage,
});

function PrintAssignmentsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const q = useQuery({
    queryKey: ["assignments-print", status, priority, from, to],
    queryFn: () =>
      listAssignmentsForPrint({
        data: {
          status: status === "all" ? undefined : (status as any),
          priority: priority === "all" ? undefined : (priority as any),
          from: from ? new Date(from).toISOString() : null,
          to: to ? new Date(to + "T23:59:59").toISOString() : null,
        },
      }),
  });

  const rows = useMemo(() => {
    const list = (q.data ?? []) as any[];
    const qry = search.trim().toLowerCase();
    if (!qry) return list;
    return list.filter((r) =>
      [r.title, r.location_text, r.location?.name]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(qry)),
    );
  }, [q.data, search]);

  const generatedBy =
    (user?.user_metadata as any)?.full_name || user?.email || "—";

  const period =
    from || to
      ? `${from ? new Date(from).toLocaleDateString("id-ID") : "—"} s/d ${to ? new Date(to).toLocaleDateString("id-ID") : "—"}`
      : "Semua Periode";

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "Dashboard", to: "/dashboard" },
        { label: "Penugasan", to: "/dashboard/tasks" },
        { label: "Cetak Laporan" },
      ]}
    >
      <div className="no-print">
        <PageHeader
          title="Laporan Penugasan"
          description="Cetak daftar penugasan lengkap dengan lokasi, petugas, dan jatuh tempo."
          actions={
            <>
              <Button variant="outline" size="sm" asChild>
                <Link to="/dashboard/tasks">Kembali</Link>
              </Button>
              <Button
                size="sm"
                onClick={() => printWithFilename("Laporan-Penugasan")}
                disabled={rows.length === 0}
              >
                <Printer className="h-4 w-4" />
                Cetak PDF
              </Button>
            </>
          }
        />

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Filter</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari judul atau lokasi…"
                  className="pl-9"
                />
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua status</SelectItem>
                  {TASK_STATUS_VALUES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {TASK_STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Prioritas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua prioritas</SelectItem>
                  {TASK_PRIORITY_VALUES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {TASK_PRIORITY_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="from" className="mb-2 block text-sm">
                  Dari tanggal dibuat
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
                  Sampai tanggal dibuat
                </Label>
                <Input
                  id="to"
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
            </div>

            <p className="text-sm">
              Ditemukan <strong>{rows.length}</strong> penugasan.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="print-area print-doc">
        <div className="print-page">
          <PrintCover
            title="Laporan Penugasan"
            subtitle="Field Work Management System"
            period={period}
            generatedBy={generatedBy}
            stats={[
              { label: "Total Penugasan", value: rows.length },
              {
                label: "Selesai",
                value: rows.filter((r) => r.status === "completed").length,
              },
              {
                label: "Dikerjakan",
                value: rows.filter((r) => r.status === "in_progress").length,
              },
              {
                label: "Ditugaskan",
                value: rows.filter((r) => r.status === "assigned").length,
              },
            ]}
          />
        </div>

        {q.isLoading ? (
          <div className="no-print">
            <Loading />
          </div>
        ) : rows.length === 0 ? (
          <div className="no-print">
            <EmptyState
              title="Tidak ada penugasan"
              description="Sesuaikan filter untuk melihat data."
            />
          </div>
        ) : (
          <div className="print-page">
            <PrintDocHeader
              title="Laporan Penugasan"
              subtitle={`${rows.length} penugasan`}
            />

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">No</TableHead>
                    <TableHead>Judul</TableHead>
                    <TableHead>Lokasi & Koordinat</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prioritas</TableHead>
                    <TableHead>Nama Petugas</TableHead>
                    <TableHead>Dibuat</TableHead>
                    <TableHead>Jatuh Tempo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, idx) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-center">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{r.title}</TableCell>
                      <TableCell>
                        <div>{r.location_text ?? "—"}</div>
                        {r.location &&
                        r.location.latitude != null &&
                        r.location.longitude != null ? (
                          <div className="text-xs text-muted-foreground">
                            {Number(r.location.latitude).toFixed(6)},{" "}
                            {Number(r.location.longitude).toFixed(6)}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={r.status}
                          label={
                            TASK_STATUS_LABEL[
                              r.status as keyof typeof TASK_STATUS_LABEL
                            ] ?? r.status
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={r.priority}
                          label={
                            TASK_PRIORITY_LABEL[
                              r.priority as keyof typeof TASK_PRIORITY_LABEL
                            ] ?? r.priority
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {r.assignees.length > 0 ? (
                          <ul className="list-inside list-disc text-sm">
                            {r.assignees.map((a: any) => (
                              <li key={a.assignee_id}>
                                {a.full_name || "—"}
                                {a.job_title ? ` (${a.job_title})` : ""}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {new Date(r.created_at).toLocaleDateString("id-ID")}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {r.due_date
                          ? new Date(r.due_date).toLocaleDateString("id-ID")
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <PrintDocFooter generatedBy={generatedBy} />
          </div>
        )}
      </div>

      <PrintStyles landscape />
    </DashboardLayout>
  );
}
