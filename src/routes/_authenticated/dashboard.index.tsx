import { createFileRoute } from "@tanstack/react-router";
import {
  ClipboardList,
  Users,
  MapPin,
  Activity,
} from "lucide-react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({
    meta: [
      { title: "Dashboard · FWMS" },
      {
        name: "description",
        content: "Ringkasan operasional Field Work Management System.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardHome,
});

const stats = [
  { label: "Tugas Aktif", value: "—", icon: ClipboardList },
  { label: "Petugas Online", value: "—", icon: Users },
  { label: "Lokasi Terpantau", value: "—", icon: MapPin },
  { label: "Sinkronisasi Hari Ini", value: "—", icon: Activity },
];

function DashboardHome() {
  const { user, roles, isAdmin, isManager } = useAuth();
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email ??
    "User";

  return (
    <DashboardLayout
      breadcrumbs={[{ label: "Home", to: "/" }, { label: "Dashboard" }]}
    >
      <PageHeader
        title={`Selamat datang, ${displayName}`}
        description={
          roles.length > 0
            ? `Peran aktif: ${roles.join(", ")}.`
            : "Anda belum memiliki peran khusus. Hubungi admin."
        }
        actions={
          (isAdmin || isManager) && <Button size="sm">Buat Tugas</Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
              <s.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-foreground">
                {s.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Aktivitas Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              title="Belum ada aktivitas"
              description="Modul penugasan dan pelaporan akan tersedia pada fase selanjutnya."
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
