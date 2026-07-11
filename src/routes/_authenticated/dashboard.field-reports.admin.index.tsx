import { useMemo, useState } from "react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Filter } from "lucide-react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import {
  listFieldReportsAdmin,
  FIELD_REPORT_STATUS_LABEL,
  FIELD_REPORT_STATUS_VALUES,
} from "@/lib/field-reports.functions";

export const Route = createFileRoute(
  "/_authenticated/dashboard/field-reports/admin/",
)({
  head: () => ({
    meta: [
      { title: "Laporan Petugas · FWMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminListPage,
});

function AdminListPage() {
  const { user, loading, isAdminTier, isManager } = useAuth();
  const [status, setStatus] = useState<string>("all");
  const [onlyObs, setOnlyObs] = useState(false);
  const [onlyOut, setOnlyOut] = useState(false);

  const q = useQuery({
    queryKey: ["field-reports", "admin", status, onlyObs, onlyOut],
    queryFn: () =>
      listFieldReportsAdmin({
        data: {
          status: status === "all" ? undefined : (status as any),
          only_obstacle: onlyObs || undefined,
          only_outside_radius: onlyOut || undefined,
        },
      }),
    enabled: !!user,
  });

  const kpi = useMemo(() => {
    const rows = (q.data ?? []) as any[];
    const today = new Date().toISOString().slice(0, 10);
    return {
      today: rows.filter((r) => r.report_date === today).length,
      pending: rows.filter((r) => r.status === "submitted").length,
      obstacle: rows.filter((r) => r.has_obstacle).length,
      outside: rows.filter((r) => r.within_radius === false).length,
      approved: rows.filter((r) => r.status === "approved").length,
    };
  }, [q.data]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;
  if (!isAdminTier && !isManager) return <Navigate to="/dashboard" />;

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "Dashboard", to: "/dashboard" },
        { label: "Laporan Petugas" },
      ]}
    >
      <PageHeader
        title="Laporan Petugas Lapangan"
        description="Verifikasi laporan, tinjau bukti, dan pantau kendala."
      />

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5 mb-3">
        <Kpi label="Laporan Hari Ini" value={kpi.today} />
        <Kpi label="Menunggu Verifikasi" value={kpi.pending} />
        <Kpi label="Berkendala" value={kpi.obstacle} />
        <Kpi label="Di Luar Radius" value={kpi.outside} />
        <Kpi label="Disetujui" value={kpi.approved} />
      </div>

      <Card className="mb-3">
        <CardContent className="flex flex-wrap items-end gap-3 p-3">
          <div>
            <Label className="text-xs"><Filter className="inline h-3 w-3" /> Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                {FIELD_REPORT_STATUS_VALUES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {FIELD_REPORT_STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={onlyObs} onCheckedChange={(v) => setOnlyObs(!!v)} />
            Hanya berkendala
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={onlyOut} onCheckedChange={(v) => setOnlyOut(!!v)} />
            Hanya di luar radius
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nomor</TableHead>
                <TableHead>Petugas</TableHead>
                <TableHead>Penugasan</TableHead>
                <TableHead>Tanggal / Jam</TableHead>
                <TableHead>Progres</TableHead>
                <TableHead>Kendala</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(q.data ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                    Tidak ada laporan.
                  </TableCell>
                </TableRow>
              ) : (
                (q.data ?? []).map((r: any) => (
                  <TableRow key={r.id} className="cursor-pointer">
                    <TableCell>
                      <Link to="/dashboard/field-reports/$reportId" params={{ reportId: r.id }} className="text-primary underline-offset-2 hover:underline">
                        {r.report_number}
                      </Link>
                    </TableCell>
                    <TableCell>{r.officer?.full_name ?? "—"}</TableCell>
                    <TableCell>{r.task?.title ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {r.report_date} {String(r.report_time ?? "").slice(0, 5)}
                    </TableCell>
                    <TableCell>{r.progress_percent}%</TableCell>
                    <TableCell>
                      {r.has_obstacle ? <Badge variant="destructive">Ya</Badge> : "—"}
                      {r.within_radius === false ? <Badge variant="outline" className="ml-1">Luar radius</Badge> : null}
                    </TableCell>
                    <TableCell>
                      <Badge>{FIELD_REPORT_STATUS_LABEL[r.status as keyof typeof FIELD_REPORT_STATUS_LABEL]}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
