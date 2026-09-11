"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "@/stores/auth-store";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from "@/components/ds/modal";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { Label } from "@/components/ds/label";
import { Textarea } from "@/components/ds/textarea";
import { Badge } from "@/components/ds/badge";
import { toast, toastError } from "@/hooks/use-toast";
import { detectPhoneMeta, getPhoneCountryByIso } from "@/lib/leads/phone-countries";
import { normalizeCountryName } from "@/lib/leads/countries";
import { Loader2, UserPlus, Save, Phone, Mail, Globe, Tag, FileText } from "lucide-react";

export interface LeadFormData {
  _id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  phoneCountry?: string;
  phoneDialCode?: string;
  phoneLength?: number;
  country?: string;
  brand?: string;
  address?: string;
  status?: string;
  agent?: string;
  notes?: string;
  tags?: string[] | string;
  source?: string;
  isSuppressed?: boolean;
  suppressionReason?: string;
}

interface LeadFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: LeadFormData | null;
  onSuccess?: (savedLead: LeadFormData, mode: "create" | "edit") => void;
}

const COMMON_STATUSES = [
  "New",
  "Contacted",
  "Qualified",
  "In Progress",
  "Unresponsive",
  "Lost",
  "Converted",
];

export function LeadFormModal({
  open,
  onOpenChange,
  lead,
  onSuccess,
}: LeadFormModalProps) {
  const { accessToken } = useAuthStore();
  const isEdit = Boolean(lead?._id);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [brand, setBrand] = useState("");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState("New");
  const [agent, setAgent] = useState("");
  const [notes, setNotes] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [isSuppressed, setIsSuppressed] = useState(false);
  const [suppressionReason, setSuppressionReason] = useState("");
  const [saving, setSaving] = useState(false);

  // Sync form values when opening or switching lead
  useEffect(() => {
    if (open) {
      if (lead) {
        setFirstName(lead.firstName || "");
        setLastName(lead.lastName || "");
        setEmail(lead.email || "");
        setPhone(lead.phone || "");
        setCountry(lead.country || "");
        setBrand(lead.brand || "");
        setAddress(lead.address || "");
        setStatus(lead.status || "New");
        setAgent(lead.agent || "");
        setNotes(lead.notes || "");
        setTagsInput(
          Array.isArray(lead.tags)
            ? lead.tags.join(", ")
            : typeof lead.tags === "string"
              ? lead.tags
              : ""
        );
        setIsSuppressed(Boolean(lead.isSuppressed));
        setSuppressionReason(lead.suppressionReason || "");
      } else {
        setFirstName("");
        setLastName("");
        setEmail("");
        setPhone("");
        setCountry("");
        setBrand("");
        setAddress("");
        setStatus("New");
        setAgent("");
        setNotes("");
        setTagsInput("");
        setIsSuppressed(false);
        setSuppressionReason("");
      }
    }
  }, [open, lead]);

  // Real-time phone metadata detection
  const phoneMeta = useMemo(() => {
    if (!phone.trim()) return null;
    const meta = detectPhoneMeta(phone.trim());
    const countryInfo = meta.phoneCountry ? getPhoneCountryByIso(meta.phoneCountry) : null;
    return {
      ...meta,
      countryName: countryInfo?.name,
    };
  }, [phone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedEmail && !trimmedPhone) {
      toastError(
        "Validation error",
        "Please provide at least an email address or a phone number."
      );
      return;
    }

    if (trimmedEmail && !trimmedEmail.includes("@")) {
      toastError("Validation error", "Please enter a valid email address.");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        email: trimmedEmail || undefined,
        phone: trimmedPhone || undefined,
        country: country.trim() || undefined,
        brand: brand.trim() || undefined,
        address: address.trim() || undefined,
        status: status.trim() || "New",
        agent: agent.trim() || undefined,
        notes: notes.trim() || undefined,
        tags: tagsInput
          ? tagsInput
              .split(/[,|;]/)
              .map((t) => t.trim())
              .filter(Boolean)
          : undefined,
        source: isEdit ? lead?.source : "Manual",
      };

      if (isEdit) {
        payload.isSuppressed = isSuppressed;
        payload.suppressionReason = isSuppressed
          ? suppressionReason.trim() || "Manually blocked"
          : undefined;
      }

      const url = isEdit
        ? `/api/v1/admin/leads/${lead!._id}`
        : "/api/v1/admin/leads";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        toastError(
          isEdit ? "Update failed" : "Creation failed",
          data.error || "Failed to save lead"
        );
        return;
      }

      toast({
        variant: "success",
        title: isEdit ? "Lead updated" : "Lead created",
        description: isEdit
          ? `Successfully updated ${[firstName, lastName].filter(Boolean).join(" ") || trimmedEmail || trimmedPhone}`
          : `Successfully created new lead ${[firstName, lastName].filter(Boolean).join(" ") || trimmedEmail || trimmedPhone}`,
      });

      onSuccess?.(data.data, isEdit ? "edit" : "create");
      onOpenChange(false);
    } catch (err) {
      toastError(
        isEdit ? "Update failed" : "Creation failed",
        err instanceof Error ? err.message : "Unknown error"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <ModalHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              {isEdit ? <Save className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            </div>
            <div>
              <ModalTitle>{isEdit ? "Edit Lead Profile" : "Add New Lead"}</ModalTitle>
              <ModalDescription>
                {isEdit
                  ? "Update contact info, status, brand, and outreach properties."
                  : "Manually add a single lead record with contact info and outreach attributes."}
              </ModalDescription>
            </div>
          </div>
        </ModalHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* First & Last Name */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="lead-first-name">First Name</Label>
              <Input
                id="lead-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Sarah"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-last-name">Last Name</Label>
              <Input
                id="lead-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Jenkins"
              />
            </div>
          </div>

          {/* Email & Phone */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="lead-email" className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                Email Address
              </Label>
              <Input
                id="lead-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-phone" className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                Phone Number
              </Label>
              <Input
                id="lead-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+447012345678"
              />
              {phoneMeta?.countryName ? (
                <div className="flex items-center gap-1.5 pt-0.5 text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {phoneMeta.countryName} ({phoneMeta.phoneDialCode})
                  </span>
                  <span>· {phoneMeta.phoneLength} digits</span>
                  {phoneMeta.lengthValid === false && (
                    <span className="text-amber-600 dark:text-amber-400">
                      (unusual length)
                    </span>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          {/* Country & Brand */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="lead-country" className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                Country
              </Label>
              <Input
                id="lead-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. United Kingdom, Germany, UAE"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-brand">Brand / Project</Label>
              <Input
                id="lead-brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Aura Store, Luxury Watches"
              />
            </div>
          </div>

          {/* Status & Assigned Agent */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="lead-status">Lead Status</Label>
              <div className="flex gap-2">
                <select
                  id="lead-status"
                  className="flex h-10 w-full rounded-[var(--radius-sm)] border border-border bg-background px-3 text-small"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {COMMON_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  {!COMMON_STATUSES.includes(status) && status ? (
                    <option value={status}>{status}</option>
                  ) : null}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-agent">Assigned Agent</Label>
              <Input
                id="lead-agent"
                value={agent}
                onChange={(e) => setAgent(e.target.value)}
                placeholder="e.g. John Doe"
              />
            </div>
          </div>

          {/* Physical Address */}
          <div className="space-y-1.5">
            <Label htmlFor="lead-address">Address (Optional)</Label>
            <Input
              id="lead-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 10 Downing Street, London, SW1A 2AA"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label htmlFor="lead-tags" className="flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              Tags (comma-separated)
            </Label>
            <Input
              id="lead-tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="vip, high-intent, ecommerce, uk-campaign"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="lead-notes" className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              Notes / Context
            </Label>
            <Textarea
              id="lead-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any relevant background, customer interests, or requirements..."
              rows={3}
              className="min-h-[80px]"
            />
          </div>

          {/* Suppression / Block Controls (Edit mode) */}
          {isEdit && (
            <div className="rounded-[var(--radius-sm)] border border-border bg-secondary/30 p-3.5 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isSuppressed}
                  onChange={(e) => setIsSuppressed(e.target.checked)}
                  className="rounded border-border text-destructive focus:ring-destructive"
                />
                <span className="text-small font-medium text-foreground">
                  Suppress / Block Lead from Email Outreach
                </span>
              </label>
              {isSuppressed && (
                <div className="pt-1">
                  <Input
                    value={suppressionReason}
                    onChange={(e) => setSuppressionReason(e.target.value)}
                    placeholder="Reason (e.g. Requested removal, bounce, invalid recipient)"
                    className="text-small h-8"
                  />
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : isEdit ? (
                <Save className="mr-2 h-4 w-4" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              {isEdit ? "Save Changes" : "Create Lead"}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}
