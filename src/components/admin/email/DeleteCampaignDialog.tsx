"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ds/modal";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { Label } from "@/components/ds/label";
import { toast, toastError } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/auth-store";
import {
  AlertTriangle,
  Trash2,
  RotateCcw,
  Lock,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

export interface RedoCampaignData {
  campaignName: string;
  subject: string;
  previewText?: string;
  headline?: string;
  body?: string;
  productId?: string;
  productName?: string;
  productPrice?: number;
  emailDocumentSnapshot?: any;
  leads: Array<{
    _id: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    country?: string;
    phone?: string;
  }>;
}

interface DeleteCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignName: string;
  initialRedo?: boolean;
  onDeleted?: () => void;
  onRedo?: (data: RedoCampaignData) => void;
}

export function DeleteCampaignDialog({
  open,
  onOpenChange,
  campaignId,
  campaignName,
  initialRedo = false,
  onDeleted,
  onRedo,
}: DeleteCampaignDialogProps) {
  const { accessToken } = useAuthStore();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [redo, setRedo] = useState(initialRedo);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleClose = () => {
    if (loading) return;
    setPassword("");
    setErrorMessage("");
    setShowPassword(false);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!password.trim()) {
      setErrorMessage("Please enter your admin account password.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch(`/api/v1/admin/email/campaigns/${campaignId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          password: password.trim(),
          redo,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.success) {
        const errText = json.error || "Failed to delete campaign. Check your password.";
        setErrorMessage(errText);
        toastError(errText);
        setLoading(false);
        return;
      }

      toast({
        title: redo ? "Campaign Cleared for Redo" : "Campaign Deleted",
        description: redo
          ? `Cleared "${campaignName}". Reopening in composer.`
          : `"${campaignName}" and all associated records have been permanently removed.`,
      });

      handleClose();

      if (redo && onRedo && json.data?.redoData) {
        onRedo(json.data.redoData);
      } else if (onDeleted) {
        onDeleted();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error deleting campaign";
      setErrorMessage(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                {redo ? "Clear & Redo Campaign" : "Delete Campaign"}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Password-protected administrative action
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          <p className="text-foreground/90">
            You are about to delete <strong className="font-semibold text-foreground">"{campaignName}"</strong>.
          </p>

          <div className="rounded-[var(--radius-sm)] border border-destructive/20 bg-destructive/5 p-3 text-xs space-y-1.5 text-destructive/90 font-medium">
            <p className="font-semibold text-destructive flex items-center gap-1.5">
              <Trash2 className="h-3.5 w-3.5" /> What will be cleaned up:
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-foreground/80 pl-1">
              <li>Atomic queue messages and delivery attempts</li>
              <li>Campaign tracking events and delivery analytics</li>
              <li>Campaign lock blockers on leads so they can be re-contacted</li>
            </ul>
          </div>

          {/* Redo Toggle */}
          <label className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-border p-3 cursor-pointer hover:bg-secondary/40 transition-colors">
            <input
              type="checkbox"
              checked={redo}
              onChange={(e) => setRedo(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 font-medium text-xs text-foreground">
                <RotateCcw className="h-3.5 w-3.5 text-primary" />
                Redo Campaign (Re-open in Email Composer)
              </div>
              <p className="text-[11px] text-muted-foreground">
                Immediately reload this campaign's target leads, subject, and content into the composer to re-send cleanly.
              </p>
            </div>
          </label>

          {/* Password Prompt */}
          <div className="space-y-1.5 pt-1">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              Enter Your Admin Account Password
            </Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && password.trim()) {
                    e.preventDefault();
                    handleDelete();
                  }
                }}
                placeholder="Enter password to authorize"
                className="pr-10 text-sm"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errorMessage && (
              <p className="text-xs text-destructive font-medium mt-1">
                {errorMessage}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant={redo ? "primary" : "destructive"}
            size="sm"
            onClick={handleDelete}
            disabled={loading || !password.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Verifying...
              </>
            ) : redo ? (
              <>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Clear &amp; Redo Campaign
              </>
            ) : (
              <>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Confirm Deletion
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
