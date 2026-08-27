"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { Label } from "@/components/ds/label";
import { Textarea } from "@/components/ds/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds/card";
import { countries, getCountryByCode } from "@/config/locales";
import {
  DEFAULT_CONTACT_COUNTRY,
  normalizeContactLocations,
  type ContactLocation,
} from "@/lib/site/contact-locations";
import { toast, toastError } from "@/hooks/use-toast";
import { ExternalLink, Loader2, Plus, Trash2 } from "lucide-react";

const emptyLocation = (countryCode: string): ContactLocation => ({
  countryCode,
  email: "",
  phone: "",
  address: "",
  hours: "",
});

export default function AdminContactPage() {
  const { accessToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [global, setGlobal] = useState<ContactLocation>(
    emptyLocation(DEFAULT_CONTACT_COUNTRY)
  );
  const [locations, setLocations] = useState<ContactLocation[]>([]);
  const [newCountry, setNewCountry] = useState("");

  useEffect(() => {
    fetch("/api/v1/settings/site")
      .then((r) => r.json())
      .then((d) => {
        if (!d.data) return;
        const all = normalizeContactLocations(d.data.contactLocations);
        const fallback = all.find((l) => l.countryCode === DEFAULT_CONTACT_COUNTRY);
        setGlobal({
          countryCode: DEFAULT_CONTACT_COUNTRY,
          email: fallback?.email || d.data.supportEmail || "",
          phone: fallback?.phone || d.data.supportPhone || "",
          address: fallback?.address || "",
          hours: fallback?.hours || "",
        });
        setLocations(all.filter((l) => l.countryCode !== DEFAULT_CONTACT_COUNTRY));
      })
      .finally(() => setLoading(false));
  }, []);

  const usedCodes = useMemo(
    () => new Set(locations.map((l) => l.countryCode)),
    [locations]
  );

  const availableCountries = countries.filter((c) => !usedCodes.has(c.code));

  const updateLocation = (index: number, patch: Partial<ContactLocation>) => {
    setLocations((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  const addCountry = () => {
    if (!newCountry || usedCodes.has(newCountry)) return;
    setLocations((rows) => [...rows, emptyLocation(newCountry)]);
    setNewCountry("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setSaving(true);
    try {
      const res = await fetch("/api/v1/admin/settings/site", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          supportEmail: global.email.trim(),
          supportPhone: global.phone.trim(),
          contactLocations: [
            { ...global, countryCode: DEFAULT_CONTACT_COUNTRY },
            ...locations,
          ],
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toastError("Save failed", data.error ?? "Could not save contact details.");
        return;
      }
      toast({
        variant: "success",
        title: "Contact saved",
        description: "The contact page now uses these details for each Deliver-to country.",
      });
    } catch {
      toastError("Save failed", "Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading contact details…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contact</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Email, phone, hours, and addresses shown on{" "}
          <a
            href="/pages/contact"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            /pages/contact <ExternalLink className="h-3 w-3" />
          </a>
          . Shoppers see the address for their Deliver-to country.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Default contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Used on the contact page, footer, and as the fallback when a country has no
              override. This is also the support email in Settings.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="contact-email">Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={global.email}
                  onChange={(e) => setGlobal({ ...global, email: e.target.value })}
                  placeholder="support@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-phone">Phone</Label>
                <Input
                  id="contact-phone"
                  value={global.phone}
                  onChange={(e) => setGlobal({ ...global, phone: e.target.value })}
                  placeholder="+1 555 000 0000"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-address">Default address</Label>
              <Textarea
                id="contact-address"
                rows={4}
                value={global.address}
                onChange={(e) => setGlobal({ ...global, address: e.target.value })}
                placeholder={"123 Commerce Street\nNew York, NY 10001\nUnited States"}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-hours">Business hours</Label>
              <Textarea
                id="contact-hours"
                rows={3}
                value={global.hours}
                onChange={(e) => setGlobal({ ...global, hours: e.target.value })}
                placeholder={"Monday – Friday: 9:00 AM – 6:00 PM"}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Addresses by shipping country</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add a local address (and optional email/phone) for each country you ship to.
              Leave email or phone blank to keep the default.
            </p>

            {locations.map((location, index) => {
              const country = getCountryByCode(location.countryCode);
              return (
                <div
                  key={location.countryCode}
                  className="space-y-3 rounded-lg border border-border p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">
                      {country
                        ? `${country.flag} ${country.name}`
                        : location.countryCode}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() =>
                        setLocations((rows) => rows.filter((_, i) => i !== index))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Address</Label>
                    <Textarea
                      rows={3}
                      value={location.address}
                      onChange={(e) =>
                        updateLocation(index, { address: e.target.value })
                      }
                      placeholder="Street, city, postcode, country"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Email override (optional)</Label>
                      <Input
                        type="email"
                        value={location.email}
                        onChange={(e) =>
                          updateLocation(index, { email: e.target.value })
                        }
                        placeholder="Same as default"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Phone override (optional)</Label>
                      <Input
                        value={location.phone}
                        onChange={(e) =>
                          updateLocation(index, { phone: e.target.value })
                        }
                        placeholder="Same as default"
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="flex flex-wrap gap-2">
              <select
                className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                value={newCountry}
                onChange={(e) => setNewCountry(e.target.value)}
              >
                <option value="">Select country</option>
                {availableCountries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.flag} {country.name}
                  </option>
                ))}
              </select>
              <Button type="button" variant="secondary" onClick={addCountry}>
                <Plus className="h-4 w-4" /> Add country address
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save contact"
            )}
          </Button>
          <Link href="/admin/cms" className="text-sm text-muted-foreground hover:underline">
            Edit page intro & labels in CMS
          </Link>
        </div>
      </form>
    </div>
  );
}
