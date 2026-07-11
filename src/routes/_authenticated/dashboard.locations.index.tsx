import { useState } from "react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Printer } from "lucide-react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteLocation, listLocations } from "@/lib/locations.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/dashboard/locations/")({
  head: () => ({
    meta: [
      { title: "Lokasi · FWMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LocationsPage,
});

function LocationsPage() {
  const { isAdminTier, isManager, loading } = useAuth();
  const canManage = isAdminTier || isManager;
  const qc = useQueryClient();
  const [toDelete, setToDelete] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["locations"],
    queryFn: () => listLocations(),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteLocation({ data: { id } }),
    onSuccess: () => {
      toast.success("Lokasi dihapus");
      qc.invalidateQueries({ queryKey: ["locations"] });
      setToDelete(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Gagal hapus"),
  });

  if (loading) return null;

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "Dashboard", to: "/dashboard" },
        { label: "Lokasi" },
      ]}
    >
      <PageHeader
        title="Lokasi"
        description="Master data lokasi kerja lapangan."
        actions={
          canManage ? (
            <Button asChild size="sm">
              <Link to="/dashboard/locations/$locationId" params={{ locationId: "new" }}>
                <Plus className="h-4 w-4" />
                Tambah Lokasi
              </Link>
            </Button>
          ) : null
        }
      />
      <Card>
        <CardContent className="p-4 sm:p-6">
          {q.isLoading ? (
            <Loading />
          ) : (q.data ?? []).length === 0 ? (
            <EmptyState
              title="Belum ada lokasi"
              description={canManage ? "Tambahkan lokasi kerja pertama." : "—"}
            />
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Alamat</TableHead>
                    <TableHead>Kota</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="w-32" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(q.data ?? []).map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {l.address ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {l.city ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {l.category ?? "—"}
                      </TableCell>
                      <TableCell className="flex justify-end gap-1">
                        <Button asChild size="sm" variant="ghost">
                          <Link
                            to="/dashboard/locations/$locationId"
                            params={{ locationId: l.id }}
                          >
                            Ubah
                          </Link>
                        </Button>
                        {canManage ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setToDelete(l.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus lokasi ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Lokasi akan dilepas dari petugas & tugas yang mereferensikannya.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => toDelete && del.mutate(toDelete)}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
