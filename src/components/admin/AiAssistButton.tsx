"use client";

import { Button } from "@/components/ds/button";
import { Loader2, Sparkles } from "lucide-react";

interface AiAssistButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
  size?: "sm" | "md";
  variant?: "outline" | "primary";
}

export function AiAssistButton({
  onClick,
  loading,
  disabled,
  label = "AI fill",
  size = "sm",
  variant = "outline",
}: AiAssistButtonProps) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="mr-2 h-4 w-4" />
      )}
      {label}
    </Button>
  );
}

export async function postAiSuggest<T>(
  accessToken: string,
  path: string,
  body: Record<string, unknown>
): Promise<{ success: boolean; data?: T; error?: string }> {
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}
