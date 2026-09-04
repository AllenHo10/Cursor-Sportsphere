"use client";

import { useRef, useState } from "react";
import { Loader2, Shield, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  TEAM_LOGO_ACCEPT,
  TEAM_LOGO_BUCKET,
  TEAM_LOGO_MAX_BYTES,
} from "@/lib/constants/team";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface TeamLogoUploadProps {
  userId: string;
  value: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

function getExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && ["jpg", "jpeg", "png", "webp", "gif"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }

  const mimeMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };

  return mimeMap[file.type] ?? "jpg";
}

export function TeamLogoUpload({
  userId,
  value,
  onChange,
  disabled = false,
}: TeamLogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const displayUrl = previewUrl ?? value;

  async function handleFileSelect(file: File) {
    setUploadError(null);

    if (!file.type.startsWith("image/")) {
      setUploadError("Please choose an image file.");
      return;
    }

    if (file.size > TEAM_LOGO_MAX_BYTES) {
      setUploadError("Image must be 5 MB or smaller.");
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setIsUploading(true);

    const supabase = createClient();
    const extension = getExtension(file);
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadErrorResult } = await supabase.storage
      .from(TEAM_LOGO_BUCKET)
      .upload(path, file, { upsert: false, contentType: file.type });

    if (uploadErrorResult) {
      URL.revokeObjectURL(localPreview);
      setPreviewUrl(null);
      setUploadError(uploadErrorResult.message);
      setIsUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(TEAM_LOGO_BUCKET).getPublicUrl(path);

    onChange(`${publicUrl}?t=${Date.now()}`);
    setIsUploading(false);
  }

  async function handleRemove() {
    setUploadError(null);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    if (value) {
      setIsUploading(true);
      const supabase = createClient();
      const storedPath = value.split("/team-logos/")[1]?.split("?")[0];

      if (storedPath) {
        await supabase.storage.from(TEAM_LOGO_BUCKET).remove([storedPath]);
      }

      setIsUploading(false);
    }

    onChange(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted",
            isUploading && "opacity-70"
          )}
        >
          {displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayUrl}
              alt="Team logo preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <Shield className="h-10 w-10 text-muted-foreground" />
          )}
          {isUploading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || isUploading}
            onClick={() => inputRef.current?.click()}
          >
            <Upload />
            {displayUrl ? "Change logo" : "Upload logo"}
          </Button>
          {displayUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || isUploading}
              onClick={handleRemove}
            >
              <X />
              Remove
            </Button>
          ) : null}
        </div>

        <input
          ref={inputRef}
          id="team-logo-upload"
          type="file"
          accept={TEAM_LOGO_ACCEPT}
          className="sr-only"
          aria-label="Upload team logo"
          disabled={disabled || isUploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void handleFileSelect(file);
            }
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Optional. JPG, PNG, WebP, or GIF up to 5 MB.
      </p>
      {uploadError ? (
        <p className="text-sm font-medium text-destructive" role="alert">
          {uploadError}
        </p>
      ) : null}
    </div>
  );
}
