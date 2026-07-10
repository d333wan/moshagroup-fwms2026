import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { CheckCheck } from "lucide-react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/common/loading";
import { EmptyState } from "@/components/common/empty-state";
import { listNotifications, markRead } from "@/lib/notifications.functions";

export const Route = createFileRoute("/_authenticated/dashboard/notifications")({
  head: () => ({
    meta: [
      { title: "Notifikasi · FWMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotifications({ data: { limit: 100 } }),
  });

  const mark = useMutation({
    mutationFn: () => markRead({ data: {} }),
    onSuccess: () => {
      toast.success("Semua notifikasi ditandai dibaca");
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notif-unread"] });
    },
  });

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "Dashboard", to: "/dashboard" },
        { label: "Notifikasi" },
      ]}
    >
      <PageHeader
        title="Notifikasi"
        description="Pemberitahuan tugas dan perubahan status."
        actions={
          <Button size="sm" variant="outline" onClick={() => mark.mutate()}>
            <CheckCheck className="h-4 w-4" />
            Tandai semua dibaca
          </Button>
        }
      />
      <Card>
        <CardContent className="p-4 sm:p-6">
          {q.isLoading ? (
            <Loading />
          ) : (q.data ?? []).length === 0 ? (
            <EmptyState title="Tidak ada notifikasi" description="Belum ada aktivitas untuk Anda." />
          ) : (
            <ul className="divide-y">
              {(q.data ?? []).map((n: any) => (
                <li key={n.id} className="flex items-start gap-3 py-3">
                  <span
                    className={`mt-2 h-2 w-2 shrink-0 rounded-full ${
                      n.is_read ? "bg-muted-foreground/30" : "bg-primary"
                    }`}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{n.title}</div>
                    {n.body ? (
                      <div className="text-sm text-muted-foreground">{n.body}</div>
                    ) : null}
                    <div className="mt-1 text-xs text-muted-foreground">
                      {new Date(n.created_at).toLocaleString("id-ID")}
                    </div>
                  </div>
                  {n.link ? (
                    <Button asChild size="sm" variant="ghost">
                      <a href={n.link}>Buka</a>
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
