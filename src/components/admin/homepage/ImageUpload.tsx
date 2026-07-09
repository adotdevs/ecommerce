"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ds/button";
import { Label } from "@/components/ds/label";
import { cn } from "@/components/ds/utils";

interface ImageUploadProps {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  accessToken: string;
  folder?: string;
  aspectHint?: string;
}

function isHttpUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function ImageUpload({
  label = "Image",
  value,
  onChange,
  accessToken,
  folder = "homepage",
  aspectHint,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [value]);

  const uploadFile = (file: File) => {
    setError(null);
    setBroken(false);
    setProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      setProgress(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.success && data.data?.url) {
            onChange(data.data.url);
          } else {
            setError(data.error ?? "Upload failed");
          }
        } catch {
          setError("Invalid server response");
        }
      } else {
        try {
          const data = JSON.parse(xhr.responseText);
          setError(data.error ?? `Upload failed (${xhr.status})`);
        } catch {
          setError(`Upload failed (${xhr.status})`);
        }
      }
    });

    xhr.addEventListener("error", () => {
      setProgress(null);
      setError("Network error during upload");
    });

    xhr.open("POST", "/api/v1/admin/upload");
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.send(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  };

  const showPreview = Boolean(value) && isHttpUrl(value);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {aspectHint && (
        <p className="text-[12px] text-muted-foreground">{aspectHint}</p>
      )}

      {showPreview ? (
        <div className="relative overflow-hidden rounded-[var(--radius-md)] border border-border bg-secondary">
          <div className="relative aspect-video max-h-48 w-full">
            {broken ? (
              <div className="flex h-full items-center justify-center px-4 text-center text-[12px] text-muted-foreground">
                Preview unavailable — URL is saved. Prefer uploading a file for reliable images.
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={value}
                src={value}
                alt=""
                className="h-full w-full object-cover"
                onError={() => setBroken(true)}
                onLoad={() => setBroken(false)}
              />
            )}
          </div>
          <div className="flex items-center gap-2 border-t border-border p-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={progress !== null}
            >
              Replace
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange("");
                setBroken(false);
              }}
              disabled={progress !== null}
            >
              <X className="h-4 w-4" /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={progress !== null}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border-2 border-dashed border-border bg-secondary/50 px-4 py-8 transition-colors hover:border-primary/50 hover:bg-secondary",
            progress !== null && "pointer-events-none opacity-70"
          )}
        >
          {progress !== null ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-small font-medium text-foreground">
                Uploading… {progress}%
              </span>
              <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-small text-muted-foreground">
                Click to upload (JPEG, PNG, WebP — max 5MB)
              </span>
            </>
          )}
        </button>
      )}

      {progress !== null && value && (
        <div className="space-y-1">
          <div className="flex justify-between text-[12px] text-muted-foreground">
            <span>Uploading new image…</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-primary transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {error && <p className="text-[12px] text-destructive">{error}</p>}
      {value && !isHttpUrl(value) && (
        <p className="text-[12px] text-destructive">Enter a valid http(s) image URL.</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="space-y-1">
        <Label className="text-[12px] text-muted-foreground">Or paste URL</Label>
        <input
          type="url"
          value={value}
          onChange={(e) => {
            setBroken(false);
            onChange(e.target.value);
          }}
          className="flex h-9 w-full rounded-[var(--radius-sm)] border border-border bg-background px-3 text-small"
          placeholder="https://..."
        />
      </div>
    </div>
  );
}
