import { useEffect, useState } from "react";
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loading } from "@/components/common/loading";
import { getLocation, upsertLocation } from "@/lib/locations.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute(
  "/_authenticated/dashboard/locations/$locationId",
)({
  head: () => ({
    meta: [
      { title: "Detail Lokasi · FWMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LocationEditPage,
});

function LocationEditPage() {
  const { locationId } = Route.useParams();
  const isNew = locationId === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAdminTier, isManager, loading } = useAuth();

  const q = useQuery({
    queryKey: ["location", locationId],
    queryFn: () => getLocation({ data: { id: locationId } }),
    enabled: !isNew,
  });

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postal, setPostal] = useState("");
  const [category, setCategory] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");

  useEffect(() => {
    if (!q.data) return;
    setName(q.data.name ?? "");
    setAddress(q.data.address ?? "");
    setCity(q.data.city ?? "");
    setProvince(q.data.province ?? "");
    setPostal(q.data.postal_code ?? "");
    setCategory(q.data.category ?? "");
    setLat(q.data.latitude != null ? String(q.data.latitude) : "");
    setLon(q.data.longitude != null ? String(q.data.longitude) : "");
  }, [q.data]);

  const save = useMutation({
    mutationFn: () =>
      upsertLocation({
        data: {
          id: isNew ? undefined : locationId,
          name,
          address: address || null,
          city: city || null,
          province: province || null,
          postal_code: postal || null,
          category: category || null,
          latitude: lat ? Number(lat) : null,
          longitude: lon ? Number(lon) : null,
          is_active: true,
        },
      }),
    onSuccess: () => {
      toast.success("Lokasi tersimpan");
      qc.invalidateQueries({ queryKey: ["locations"] });
      navigate({ to: "/dashboard/locations" });
    },
    onError: (e: any) => toast.error(e?.message ?? "Gagal simpan"),
  });

  if (loading) return null;
  if (!isAdminTier && !isManager) return <Navigate to="/dashboard/locations" />;

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "Dashboard", to: "/dashboard" },
        { label: "Lokasi", to: "/dashboard/locations" },
        { label: isNew ? "Tambah" : name || "Ubah" },
      ]}
    >
      <PageHeader
        title={isNew ? "Tambah Lokasi" : "Ubah Lokasi"}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: "/dashboard/locations" })}
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Button>
        }
      />

      {!isNew && q.isLoading ? (
        <Loading />
      ) : (
        <Card>
          <CardContent className="p-4 sm:p-6">
            <form
              className="grid gap-5"
              onSubmit={(e) => {
                e.preventDefault();
                if (name.trim().length < 2) {
                  toast.error("Nama minimal 2 karakter");
                  return;
                }
                save.mutate();
              }}
            >
              <div className="grid gap-2">
                <Label htmlFor="nm">Nama Lokasi</Label>
                <Input id="nm" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ad">Alamat</Label>
                <Textarea id="ad" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="grid gap-5 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="ct">Kota</Label>
                  <Input id="ct" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pv">Provinsi</Label>
                  <Input id="pv" value={province} onChange={(e) => setProvince(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ps">Kode Pos</Label>
                  <Input id="ps" value={postal} onChange={(e) => setPostal(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="cat">Kategori</Label>
                  <Input id="cat" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="kantor / gudang / site" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="la">Latitude</Label>
                  <Input id="la" value={lat} onChange={(e) => setLat(e.target.value)} inputMode="decimal" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lo">Longitude</Label>
                  <Input id="lo" value={lon} onChange={(e) => setLon(e.target.value)} inputMode="decimal" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => navigate({ to: "/dashboard/locations" })}>
                  Batal
                </Button>
                <Button type="submit" disabled={save.isPending}>
                  {save.isPending ? "Menyimpan…" : "Simpan"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
