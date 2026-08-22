import { useId, useRef, useState } from "react";
import { FileImage, Loader2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { uploadFile } from "@/lib/api/files";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export interface ImageUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  className?: string;
  label: string;
  hint?: string;
  help?: string;
  previewAlt?: string;
}

/** Image upload with drag-and-drop, used for NRC photos and similar documents. */
export function ImageUploadField({
  value,
  onChange,
  disabled = false,
  className,
  label,
  hint,
  help,
  previewAlt,
}: ImageUploadFieldProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setUploading] = useState(false);
  const [isDragging, setDragging] = useState(false);
  const descId = useId();

  const busy = disabled || isUploading;

  async function ingest(file: File | undefined | null) {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      toast.error(t("p2p.apply.uploadInvalidType"));
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(t("p2p.apply.uploadTooLarge"));
      return;
    }
    setUploading(true);
    try {
      const { url } = await uploadFile(file);
      onChange(url);
      toast.success(t("p2p.apply.uploadSuccess"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("p2p.apply.uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  function openPicker() {
    if (!busy) inputRef.current?.click();
  }

  function clear() {
    onChange("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className={cn("min-w-0", className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {help && (
        <p id={descId} className="mt-0.5 text-xs text-muted-foreground">
          {help}
        </p>
      )}

      {value ? (
        <div
          className="mt-2 flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-3"
          role="region"
          aria-label={label}
        >
          <img
            src={value}
            alt={previewAlt ?? label}
            className="h-20 w-20 shrink-0 rounded-md border border-border/60 object-cover"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-medium text-foreground">{t("p2p.apply.uploadAttached")}</p>
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary underline-offset-2 hover:underline"
            >
              {t("p2p.apply.uploadViewFull")}
            </a>
          </div>
          <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
            <button
              type="button"
              onClick={openPicker}
              disabled={busy}
              className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-50"
            >
              {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("p2p.apply.uploadReplace")}
            </button>
            <button
              type="button"
              onClick={clear}
              disabled={busy}
              aria-label={t("p2p.apply.uploadRemove")}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={busy ? -1 : 0}
          aria-label={label}
          aria-describedby={help ? descId : undefined}
          aria-disabled={busy}
          aria-busy={isUploading}
          onClick={openPicker}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openPicker();
            }
          }}
          onDragOver={(e) => {
            if (busy) return;
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!busy) void ingest(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "mt-2 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            busy
              ? "cursor-not-allowed border-border/60 bg-muted/20 opacity-70"
              : "cursor-pointer hover:border-primary/50 hover:bg-muted/30",
            isDragging ? "border-primary bg-primary/10" : "border-border/70 bg-muted/20",
          )}
        >
          {isUploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
          ) : isDragging ? (
            <UploadCloud className="h-6 w-6 text-primary" aria-hidden />
          ) : (
            <FileImage className="h-6 w-6 text-muted-foreground" aria-hidden />
          )}
          <div>
            <p className="text-sm font-medium text-foreground">
              {isUploading
                ? t("p2p.apply.uploading")
                : isDragging
                  ? t("p2p.apply.uploadDrop")
                  : t("p2p.apply.uploadDropzone")}
            </p>
            {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="sr-only"
        tabIndex={-1}
        disabled={busy}
        onChange={(e) => {
          void ingest(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
