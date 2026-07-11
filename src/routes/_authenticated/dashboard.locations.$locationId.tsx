import { useEffect, useRef, useState } from "react";
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ImagePlus, X } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";

const MAX_PHOTOS = 4;
const BUCKET = "location-photos";

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
  const { user, isAdminTier, isManager, loading } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

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
  const [pic, setPic] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]); // storage paths
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

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
    setPic(q.data.pic ?? "");
    setNotes(q.data.notes ?? "");
    setPhotos((q.data.photos ?? []) as string[]);
  }, [q.data]);

  // Resolve signed URLs for photos so previews render
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const missing = photos.filter((p) => !signedUrls[p]);
      if (missing.length === 0) return;
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(missing, 60 * 60);
      if (error || !data || cancelled) return;
      const next = { ...signedUrls };
      data.forEach((d, i) => {
        if (d.signedUrl) next[missing[i]] = d.signedUrl;
      });
      setSignedUrls(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [photos]);

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
          pic: pic || null,
          notes: notes || null,
          photos,
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

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    const slots = MAX_PHOTOS - photos.length;
    if (slots <= 0) {
      toast.error(`Maksimal ${MAX_PHOTOS} foto`);
      return;
    }
    const list = Array.from(files).slice(0, slots);
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of list) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} bukan gambar`);
          continue;
        }
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user?.id ?? "anon"}/${
          isNew ? "draft" : locationId
        }/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { upsert: false, contentType: file.type });
        if (error) {
          toast.error(`Gagal unggah ${file.name}: ${error.message}`);
          continue;
        }
        uploaded.push(path);
      }
      if (uploaded.length > 0) {
        setPhotos((p) => [...p, ...uploaded]);
        toast.success(`${uploaded.length} foto diunggah`);
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removePhoto(path: string) {
    setPhotos((p) => p.filter((x) => x !== path));
    void supabase.storage.from(BUCKET).remove([path]);
  }

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
              <div className="grid gap-2">
                <Label htmlFor="pic">PIC (Penanggung Jawab)</Label>
                <Input id="pic" value={pic} onChange={(e) => setPic(e.target.value)} placeholder="Nama / Jabatan / No. HP" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nt">Keterangan</Label>
                <Textarea id="nt" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Foto Lokasi (maks. {MAX_PHOTOS})</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={uploading || photos.length >= MAX_PHOTOS}
                    onClick={() => fileRef.current?.click()}
                  >
                    <ImagePlus className="h-4 w-4" />
                    {uploading ? "Mengunggah…" : "Tambah Foto"}
                  </Button>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => handleUpload(e.target.files)}
                />
                {photos.length === 0 ? (
                  <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Belum ada foto
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {photos.map((p) => (
                      <div
                        key={p}
                        className="relative aspect-square overflow-hidden rounded-md border bg-muted"
                      >
                        {signedUrls[p] ? (
                          <img
                            src={signedUrls[p]}
                            alt="Foto lokasi"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                            Memuat…
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removePhoto(p)}
                          className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black"
                          aria-label="Hapus foto"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
