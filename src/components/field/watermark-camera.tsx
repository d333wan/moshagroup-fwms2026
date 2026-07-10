import { useRef, useState } from "react";
import { Camera, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export type WatermarkedFile = {
  file: File;
  previewUrl: string;
  lat: number | null;
  lon: number | null;
  takenAt: string;
};

interface Props {
  officerName?: string | null;
  onChange: (files: WatermarkedFile[]) => void;
  files: WatermarkedFile[];
}

async function getCoords(): Promise<{ lat: number | null; lon: number | null }> {
  if (!("geolocation" in navigator)) return { lat: null, lon: null };
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => resolve({ lat: null, lon: null }),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}

async function watermarkImage(
  file: File,
  officerName: string,
  coords: { lat: number | null; lon: number | null },
  takenAt: Date,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const maxW = 1600;
  const scale = bitmap.width > maxW ? maxW / bitmap.width : 1;
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);

  // watermark overlay
  const pad = Math.round(w * 0.02);
  const fontSize = Math.max(14, Math.round(w * 0.022));
  const lineH = Math.round(fontSize * 1.35);
  const lines = [
    officerName || "Petugas",
    takenAt.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "medium" }),
    coords.lat != null && coords.lon != null
      ? `${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}`
      : "GPS tidak tersedia",
  ];
  const boxH = lineH * lines.length + pad * 1.2;
  const boxW = w;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, h - boxH, boxW, boxH);
  ctx.fillStyle = "#fff";
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.textBaseline = "top";
  lines.forEach((line, i) => {
    ctx.fillText(line, pad, h - boxH + pad * 0.5 + i * lineH);
  });

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Encode gagal"))),
      "image/jpeg",
      0.85,
    ),
  );
}

export function WatermarkCamera({ officerName, onChange, files }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    setBusy(true);
    try {
      const coords = await getCoords();
      const takenAt = new Date();
      const out: WatermarkedFile[] = [];
      for (const f of Array.from(list)) {
        if (!f.type.startsWith("image/")) {
          out.push({
            file: f,
            previewUrl: URL.createObjectURL(f),
            lat: coords.lat,
            lon: coords.lon,
            takenAt: takenAt.toISOString(),
          });
          continue;
        }
        const stamped = await watermarkImage(
          f,
          officerName ?? "Petugas",
          coords,
          takenAt,
        );
        const stampedFile = new File(
          [stamped],
          f.name.replace(/\.[^.]+$/, "") + "-wm.jpg",
          { type: "image/jpeg" },
        );
        out.push({
          file: stampedFile,
          previewUrl: URL.createObjectURL(stampedFile),
          lat: coords.lat,
          lon: coords.lon,
          takenAt: takenAt.toISOString(),
        });
      }
      onChange([...files, ...out]);
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal proses foto");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={() => cameraRef.current?.click()}
          disabled={busy}
        >
          <Camera className="h-4 w-4" />
          {busy ? "Memproses…" : "Ambil Foto"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => galleryRef.current?.click()}
          disabled={busy}
        >
          <ImageIcon className="h-4 w-4" />
          Dari Galeri
        </Button>
        <span className="text-xs text-muted-foreground">
          {files.length} foto — watermark tanggal, jam &amp; koordinat otomatis
        </span>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {files.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {files.map((pf, idx) => (
            <div
              key={idx}
              className="group relative overflow-hidden rounded-md border bg-muted"
            >
              {pf.file.type.startsWith("image/") ? (
                <img
                  src={pf.previewUrl}
                  alt={pf.file.name}
                  className="h-28 w-full object-cover"
                />
              ) : (
                <div className="flex h-28 items-center justify-center px-2 text-center text-xs">
                  {pf.file.name}
                </div>
              )}
              <div className="px-2 py-1 text-[10px] text-muted-foreground">
                {new Date(pf.takenAt).toLocaleString("id-ID")}
                {pf.lat != null && pf.lon != null
                  ? ` · ${pf.lat.toFixed(3)},${pf.lon.toFixed(3)}`
                  : ""}
              </div>
              <button
                type="button"
                className="absolute right-1 top-1 rounded-full bg-background/80 p-1 opacity-0 transition group-hover:opacity-100"
                onClick={() => onChange(files.filter((_, i) => i !== idx))}
                aria-label="Hapus"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
