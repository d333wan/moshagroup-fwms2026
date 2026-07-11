import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/common/loading";
import { EmptyState } from "@/components/common/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listOfficers } from "@/lib/officers.functions";
import { useAuth } from "@/hooks/use-auth";
import { Navigate } from "@tanstack/react-router";


const STATUS_LABEL: Record<string, string> = {
  available: "Tersedia",
  on_duty: "Bertugas",
  off_duty: "Libur",
  leave: "Cuti",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  available: "default",
  on_duty: "secondary",
  off_duty: "outline",
  leave: "outline",
};

export const Route = createFileRoute("/_authenticated/dashboard/officers/")({
  head: () => ({
    meta: [
      { title: "Petugas Lapangan · FWMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OfficersPage,
});

function OfficersPage() {
  const { isAdminTier, isManager, loading } = useAuth();
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ["officers"],
    queryFn: () => listOfficers(),
    enabled: isAdminTier || isManager,
  });

  if (loading) return null;
  if (!isAdminTier && !isManager) return <Navigate to="/dashboard" />;

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "Dashboard", to: "/dashboard" },
        { label: "Petugas Lapangan" },
      ]}
    >
      <PageHeader
        title="Petugas Lapangan"
        description="Daftar petugas, jabatan, nomor kontak, dan status ketersediaan."
        actions={
          <Button asChild size="sm" variant="outline">
            <Link to="/dashboard/officers/print">
              <Printer className="h-4 w-4" />
              Cetak PDF
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4 sm:p-6">
          {q.isLoading ? (
            <Loading />
          ) : (q.data ?? []).length === 0 ? (
            <EmptyState
              title="Belum ada petugas"
              description="Tambahkan pengguna dengan peran petugas lapangan terlebih dahulu."
            />
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Jabatan</TableHead>
                    <TableHead>No. HP</TableHead>
                    <TableHead>Departemen</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(q.data ?? []).map((o: any) => (
                    <TableRow key={o.user_id}>
                      <TableCell className="font-medium">
                        <div>{o.full_name || "(tanpa nama)"}</div>
                        <div className="text-xs text-muted-foreground">
                          {o.employee_id ?? o.role}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {o.job_title ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {o.phone ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {o.department ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[o.status] ?? "outline"}>
                          {STATUS_LABEL[o.status] ?? o.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button asChild size="sm" variant="ghost">
                          <Link
                            to="/dashboard/officers/$userId"
                            params={{ userId: o.user_id }}
                          >
                            Ubah
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
