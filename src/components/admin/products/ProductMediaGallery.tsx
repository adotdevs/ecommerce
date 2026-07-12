"use client";

import { useEffect, useRef, useState } from "react";
import {
  Upload,
  X,
  Loader2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Star,
} from "lucide-react";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { Label } from "@/components/ds/label";
import { cn } from "@/components/ds/utils";

export interface ProductMediaItem {
  url: string;
  alt?: string;
  type: "image" | "video";
  sortOrder: number;
}

interface ProductMediaGalleryProps {
  value: ProductMediaItem[];
  onChange: (media: ProductMediaItem[]) => void;
  accessToken: string;
  /** Product name — AI writes alt text on upload */
  productName?: string;
}

async function fetchAiAltText(
  accessToken: string,
  productName: string,
  imageIndex: number
): Promise<string | null> {
  try {
    const res = await fetch("/api/v1/admin/ai/suggest-alt-text", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ productName, imageIndex }),
    });
    const json = await res.json();
    if (!json.success) return null;
    return (json.data?.alt as string) || null;
  } catch {
    return null;
  }
}

function isHttpUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function ProductMediaGallery({
  value,
  onChange,
  accessToken,
  productName,
}: ProductMediaGalleryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(value);
  const [uploading, setUploading] = useState(false);
  const [uploadIndex, setUploadIndex] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const uploadSingle = (
    file: File
  ): Promise<{ url: string | null; error?: string }> =>
    new Promise((resolve) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "products");

      const xhr = new XMLHttpRequest();
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve({
              url: data.success && data.data?.url ? data.data.url : null,
              error: data.error,
            });
          } catch {
            resolve({ url: null, error: "Invalid server response" });
          }
        } else {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve({ url: null, error: data.error ?? `Upload failed (${xhr.status})` });
          } catch {
            resolve({ url: null, error: `Upload failed (${xhr.status})` });
          }
        }
      });
      xhr.addEventListener("error", () =>
        resolve({ url: null, error: "Network error during upload" })
      );
      xhr.open("POST", "/api/v1/admin/upload");
      xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
      xhr.send(formData);
    });

  const uploadFiles = async (files: File[]) => {
    if (!files.length) return;
    setError(null);
    setUploading(true);
    setUploadIndex({ done: 0, total: files.length });

    const startLength = valueRef.current.length;
    const added: ProductMediaItem[] = [];
    let failed = 0;

    let lastError: string | undefined;

    for (let i = 0; i < files.length; i++) {
      const result = await uploadSingle(files[i]);
      if (result.url) {
        const imageIndex = startLength + added.length;
        const alt =
          productName?.trim() && accessToken
            ? (await fetchAiAltText(accessToken, productName.trim(), imageIndex)) ?? ""
            : "";
        added.push({
          url: result.url,
          alt,
          type: "image",
          sortOrder: imageIndex,
        });
      } else {
        failed++;
        lastError = result.error;
      }
      setUploadIndex({ done: i + 1, total: files.length });
    }

    if (added.length) {
      onChange([...valueRef.current, ...added]);
    }
    if (failed > 0) {
      setError(
        lastError && failed === files.length
          ? lastError
          : `${failed} file(s) failed to upload.${lastError ? ` ${lastError}` : ""}`
      );
    }

    setUploading(false);
    setUploadIndex({ done: 0, total: 0 });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    void uploadFiles(Array.from(files));
    e.target.value = "";
  };

  const updateItem = (index: number, patch: Partial<ProductMediaItem>) => {
    const next = value.map((item, i) =>
      i === index ? { ...item, ...patch } : item
    );
    onChange(next);
  };

  const removeItem = (index: number) => {
    onChange(
      value
        .filter((_, i) => i !== index)
        .map((item, i) => ({ ...item, sortOrder: i }))
    );
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((item, i) => ({ ...item, sortOrder: i })));
  };

  const addUrl = async (url: string) => {
    if (!isHttpUrl(url)) return;
    const imageIndex = value.length;
    const alt =
      productName?.trim() && accessToken
        ? (await fetchAiAltText(accessToken, productName.trim(), imageIndex)) ?? ""
        : "";
    onChange([
      ...value,
      { url, alt, type: "image", sortOrder: imageIndex },
    ]);
  };

  const progressPct =
    uploadIndex.total > 0
      ? Math.round((uploadIndex.done / uploadIndex.total) * 100)
      : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label>Product images</Label>
          <p className="text-[12px] text-muted-foreground">
            Select multiple files at once. First image is the primary thumbnail.
            {productName?.trim() ? " AI writes alt text on upload." : ""}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Upload images
        </Button>
      </div>

      {uploading && (
        <div className="space-y-1">
          <div className="flex justify-between text-[12px] text-muted-foreground">
            <span>
              Uploading {uploadIndex.done} of {uploadIndex.total}…
            </span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {error && <p className="text-[12px] text-destructive">{error}</p>}

      {value.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border-2 border-dashed border-border bg-secondary/50 px-4 py-12 transition-colors hover:border-primary/50",
            uploading && "pointer-events-none opacity-70"
          )}
        >
          <Upload className="h-10 w-10 text-muted-foreground" />
          <span className="text-small text-muted-foreground">
            Upload product images (JPEG, PNG, WebP — max 5MB each, multiple allowed)
          </span>
        </button>
      ) : (
        <div className="space-y-3">
          {value.map((item, index) => (
            <div
              key={`${item.url}-${index}`}
              className="flex gap-3 rounded-[var(--radius-md)] border border-border bg-card p-3"
            >
              <div className="flex flex-col items-center gap-1 pt-1">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => moveItem(index, -1)}
                  disabled={index === 0}
                  title="Move up"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => moveItem(index, 1)}
                  disabled={index === value.length - 1}
                  title="Move down"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md border border-border bg-secondary">
                {index === 0 && (
                  <span className="absolute left-1 top-1 z-10 flex items-center gap-0.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-white">
                    <Star className="h-2.5 w-2.5" /> Primary
                  </span>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt={item.alt || ""}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Input
                  value={item.alt ?? ""}
                  onChange={(e) => updateItem(index, { alt: e.target.value })}
                  placeholder="Alt text for accessibility & SEO"
                  className="text-small"
                />
                <p className="truncate text-[11px] text-muted-foreground">
                  {item.url}
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeItem(index)}
                title="Remove"
              >
                <X className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-[12px] text-muted-foreground">
          Or paste image URL
        </Label>
        <div className="flex gap-2">
          <Input
            id="media-url-input"
            type="url"
            placeholder="https://..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const input = e.currentTarget;
                void addUrl(input.value);
                input.value = "";
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const input = document.getElementById(
                "media-url-input"
              ) as HTMLInputElement;
              if (input?.value) {
                void addUrl(input.value);
                input.value = "";
              }
            }}
          >
            Add
          </Button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
