import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  createAttachment,
  deleteAttachment,
  listAttachments,
} from "@/lib/attachments.functions";
import { useAuth } from "@/hooks/use-auth";

type Scope = "task" | "location" | "report";

const BUCKET: Record<Scope, string> = {
  task: "task-attachments",
  location: "location-attachments",
  report: "field-report-docs",
};

interface Props {
  scope: Scope;
  parentId: string;
  /** Batas maksimum. Default 8, kecuali report=4 (juga divalidasi server). */
  max?: number;
  /** Batas ukuran per file (MB). */
  maxSizeMB?: number;
  /** Ekstensi/mime yang diperbolehkan. */
  accept?: string;
  /** Ijinkan pilih jenis dokumen (surat_tugas/other). */
  showKind?: boolean;
  /** Kontrol izin upload. Default: admin/manager utk task+loc; owner utk report. */
  canUpload?: boolean;
  /** Kontrol izin hapus. */
  canDelete?: boolean;
  title?: string;
  emptyText?: string;
}

function formatBytes(n?: number | null) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function AttachmentsPanel({
  scope,
  parentId,
  max = scope === "report" ? 4 : 8,
  maxSizeMB = scope === "report" ? 10 : 20,
  accept = scope === "report" ? "application/pdf" : "*/*",
  showKind = scope !== "report",
  canUpload = true,
  canDelete = true,
  title,
  emptyText = "Belum ada dokumen.",
}: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [kind, setKind] = useState<"surat_tugas" | "other">("surat_tugas");

  const q = useQuery({
    queryKey: ["attachments", scope, parentId],
    queryFn: () =>
      listAttachments({ data: { scope, parent_id: parentId } }) as any,
    enabled: !!parentId,
  });

  const del = useMutation({
    mutationFn: (id: string) =>
      deleteAttachment({ data: { scope, id } }) as any,
    onSuccess: () => {
      toast.success("Dokumen dihapus");
      qc.invalidateQueries({ queryKey: ["attachments", scope, parentId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Gagal hapus"),
  });

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0 || !user) return;
    const list = q.data ?? [];
    if (list.length + files.length > max) {
      toast.error(`Maksimal ${max} dokumen`);
      return;
    }
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        if (f.size > maxSizeMB * 1024 * 1024) {
          toast.error(`${f.name} melebihi ${maxSizeMB} MB`);
          continue;
        }
        const extMatch = /\.([a-z0-9]+)$/i.exec(f.name);
        const ext = extMatch ? extMatch[1] : "bin";
        const path = `${user.id}/${parentId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET[scope])
          .upload(path, f, {
            contentType: f.type || undefined,
            upsert: false,
          });
        if (upErr) throw new Error(`${f.name}: ${upErr.message}`);
        await createAttachment({
          data: {
            scope,
            parent_id: parentId,
            kind: showKind ? kind : undefined,
            filename: f.name,
            storage_path: path,
            mime_type: f.type || null,
            size_bytes: f.size,
          },
        });
      }
      toast.success("Berhasil unggah");
      qc.invalidateQueries({ queryKey: ["attachments", scope, parentId] });
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal unggah");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const items = (q.data ?? []) as any[];

  return (
    <div className="grid gap-3">
      {title ? (
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">
            {items.length}/{max}
          </div>
        </div>
      ) : null}

      {canUpload ? (
        <div className="flex flex-wrap items-center gap-2">
          {showKind ? (
            <Select value={kind} onValueChange={(v) => setKind(v as any)}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="surat_tugas">Surat Tugas</SelectItem>
                <SelectItem value="other">Dokumen Lain</SelectItem>
              </SelectContent>
            </Select>
          ) : null}
          <input
            ref={fileRef}
            type="file"
            hidden
            multiple
            accept={accept}
            onChange={(e) => onPick(e.target.files)}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={uploading || items.length >= max}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            {uploading ? "Mengunggah…" : "Unggah"}
          </Button>
          <span className="text-xs text-muted-foreground">
            Maks. {maxSizeMB} MB per file
            {accept === "application/pdf" ? " · hanya PDF" : ""}
          </span>
        </div>
      ) : null}

      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="grid gap-2">
          {items.map((it) => (
            <li
              key={it.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm"
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="truncate font-medium">{it.filename}</div>
                  <div className="text-xs text-muted-foreground">
                    {it.kind === "surat_tugas" ? "Surat Tugas · " : ""}
                    {formatBytes(it.size_bytes)}
                    {it.created_at
                      ? ` · ${new Date(it.created_at).toLocaleDateString("id-ID")}`
                      : ""}
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                {it.url ? (
                  <a href={it.url} target="_blank" rel="noreferrer" download>
                    <Button size="sm" variant="ghost">
                      <Download className="h-4 w-4" /> Unduh
                    </Button>
                  </a>
                ) : null}
                {canDelete ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Hapus ${it.filename}?`)) del.mutate(it.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
