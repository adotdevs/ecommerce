"use client";

import { Input } from "@/components/ds/input";
import { Label } from "@/components/ds/label";
import { Textarea } from "@/components/ds/textarea";
import { Button } from "@/components/ds/button";
import { ImageUpload } from "@/components/admin/homepage/ImageUpload";
import { ProductLinkPicker, LinkListPicker } from "@/components/admin/homepage/ProductLinkPicker";
import { Plus, Trash2 } from "lucide-react";

interface EditorProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  accessToken: string;
}

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {multiline ? (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

export function HeroSliderEditor({ config, onChange, accessToken }: EditorProps) {
  const slides = (config.slides as Array<{
    title: string;
    subtitle: string;
    image: string;
    cta?: { label: string; href: string };
    productLink?: string;
  }>) ?? [];

  const updateSlide = (index: number, patch: Partial<(typeof slides)[0]>) => {
    const next = slides.map((s, i) => (i === index ? { ...s, ...patch } : s));
    onChange({ ...config, slides: next });
  };

  const addSlide = () => {
    onChange({
      ...config,
      slides: [
        ...slides,
        {
          title: "Shop the collection",
          subtitle: "Discover bestsellers with free shipping on orders over $100.",
          image: "",
          cta: { label: "Shop Now", href: "/products" },
        },
      ],
    });
  };

  const removeSlide = (index: number) => {
    onChange({ ...config, slides: slides.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      <p className="rounded-[var(--radius-sm)] border border-border bg-secondary/50 px-3 py-2 text-[12px] text-muted-foreground">
        Retail promo banner: text sits on a theme-colored panel; image fills the right side. Use landscape product photos (≈1600×900).
      </p>
      <Field
        label="Hero badge text"
        value={(config.heroBadge as string) ?? ""}
        onChange={(v) => onChange({ ...config, heroBadge: v })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Secondary button label"
          value={(config.exploreNewLabel as string) ?? ""}
          onChange={(v) => onChange({ ...config, exploreNewLabel: v })}
        />
        <Field
          label="Secondary button link"
          value={(config.exploreNewHref as string) ?? ""}
          onChange={(v) => onChange({ ...config, exploreNewHref: v })}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-body font-semibold">Banner slides</Label>
          <Button type="button" variant="outline" size="sm" onClick={addSlide}>
            <Plus className="h-4 w-4" /> Add slide
          </Button>
        </div>
        {slides.map((slide, i) => (
          <div key={i} className="space-y-4 rounded-[var(--radius-md)] border border-border p-4">
            <div className="flex items-center justify-between">
              <span className="text-small font-medium">Slide {i + 1}</span>
              {slides.length > 1 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => removeSlide(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Field label="Headline" value={slide.title} onChange={(v) => updateSlide(i, { title: v })} />
            <Field
              label="Supporting text"
              value={slide.subtitle}
              onChange={(v) => updateSlide(i, { subtitle: v })}
              multiline
            />
            <ImageUpload
              label="Banner image (full-bleed background)"
              value={slide.image}
              onChange={(url) => updateSlide(i, { image: url })}
              accessToken={accessToken}
              folder="homepage/hero"
              aspectHint="Recommended: 1600×900px landscape product / lifestyle photo"
            />
            <ProductLinkPicker
              label="Link to product (optional — auto-fills image & CTA)"
              value={slide.productLink ?? ""}
              onChange={(v) => updateSlide(i, { productLink: v })}
              accessToken={accessToken}
              hint="Start typing a product name or slug to see suggestions"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Primary CTA label"
                value={slide.cta?.label ?? ""}
                onChange={(v) =>
                  updateSlide(i, { cta: { ...slide.cta, label: v, href: slide.cta?.href ?? "/products" } })
                }
              />
              <Field
                label="Primary CTA link"
                value={slide.cta?.href ?? ""}
                onChange={(v) =>
                  updateSlide(i, { cta: { label: slide.cta?.label ?? "Shop", href: v } })
                }
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrustBadgesEditor({ config, onChange }: Omit<EditorProps, "accessToken">) {
  const badges = (config.badges as Array<{
    icon: string;
    title?: string;
    label?: string;
    description: string;
  }>) ?? [];

  const update = (index: number, patch: Partial<(typeof badges)[0]>) => {
    onChange({
      ...config,
      badges: badges.map((b, i) => (i === index ? { ...b, ...patch } : b)),
    });
  };

  return (
    <div className="space-y-4">
      {badges.map((badge, i) => (
        <div key={i} className="space-y-3 rounded-[var(--radius-md)] border border-border p-4">
          <Label>Badge {i + 1}</Label>
          <Field
            label="Icon key (truck, shield, refresh, headphones)"
            value={badge.icon ?? ""}
            onChange={(v) => update(i, { icon: v })}
          />
          <Field
            label="Title"
            value={badge.title ?? badge.label ?? ""}
            onChange={(v) => update(i, { title: v, label: v })}
          />
          <Field
            label="Description"
            value={badge.description}
            onChange={(v) => update(i, { description: v })}
            multiline
          />
        </div>
      ))}
    </div>
  );
}

export function FeaturedProductsEditor({ config, onChange, accessToken }: EditorProps) {
  const mode = (config.selectionMode as string) ?? "auto";
  const productLinks = (config.productLinks as string[]) ?? [];

  return (
    <div className="space-y-4">
      <Field
        label="Section title"
        value={(config.title as string) ?? ""}
        onChange={(v) => onChange({ ...config, title: v })}
      />
      <Field
        label="Subtitle"
        value={(config.subtitle as string) ?? ""}
        onChange={(v) => onChange({ ...config, subtitle: v })}
        multiline
      />
      <Field
        label="View all button label"
        value={(config.viewAllLabel as string) ?? ""}
        onChange={(v) => onChange({ ...config, viewAllLabel: v })}
      />

      <div className="space-y-2">
        <Label>Product selection</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === "auto" ? "primary" : "outline"}
            onClick={() => onChange({ ...config, selectionMode: "auto" })}
          >
            Auto (featured in catalog)
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "manual" ? "primary" : "outline"}
            onClick={() => onChange({ ...config, selectionMode: "manual" })}
          >
            Manual (pick by link)
          </Button>
        </div>
      </div>

      {mode === "auto" ? (
        <Field
          label="Product limit"
          value={String((config.limit as number) ?? 4)}
          onChange={(v) => onChange({ ...config, limit: parseInt(v) || 4 })}
        />
      ) : (
        <LinkListPicker
          label="Featured products"
          links={productLinks}
          onChange={(links) => onChange({ ...config, productLinks: links, selectionMode: "manual" })}
          accessToken={accessToken}
          type="product"
          hint="Search by name or slug to add products. Order here is display order on the homepage."
        />
      )}
    </div>
  );
}

export function CategoryShowcaseEditor({ config, onChange, accessToken }: EditorProps) {
  const mode = (config.selectionMode as string) ?? "auto";
  const categoryLinks = (config.categoryLinks as string[]) ?? [];

  return (
    <div className="space-y-4">
      <Field
        label="Section title"
        value={(config.title as string) ?? ""}
        onChange={(v) => onChange({ ...config, title: v })}
      />
      <Field
        label="Subtitle"
        value={(config.subtitle as string) ?? ""}
        onChange={(v) => onChange({ ...config, subtitle: v })}
        multiline
      />

      <div className="space-y-2">
        <Label>Category selection</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === "auto" ? "primary" : "outline"}
            onClick={() => onChange({ ...config, selectionMode: "auto" })}
          >
            Auto (top categories)
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "manual" ? "primary" : "outline"}
            onClick={() => onChange({ ...config, selectionMode: "manual" })}
          >
            Manual (pick by link)
          </Button>
        </div>
      </div>

      {mode === "manual" && (
        <LinkListPicker
          label="Featured categories"
          links={categoryLinks}
          onChange={(links) => onChange({ ...config, categoryLinks: links, selectionMode: "manual" })}
          accessToken={accessToken}
          type="category"
          hint="Search by name or slug to add categories. Order here is display order on the homepage."
        />
      )}
    </div>
  );
}

export function PromoBannerEditor({ config, onChange, accessToken }: EditorProps) {
  const cta = config.cta as { label: string; href: string } | undefined;
  return (
    <div className="space-y-4">
      <Field
        label="Eyebrow text"
        value={(config.eyebrow as string) ?? ""}
        onChange={(v) => onChange({ ...config, eyebrow: v })}
      />
      <Field
        label="Title"
        value={(config.title as string) ?? ""}
        onChange={(v) => onChange({ ...config, title: v })}
      />
      <Field
        label="Subtitle"
        value={(config.subtitle as string) ?? ""}
        onChange={(v) => onChange({ ...config, subtitle: v })}
        multiline
      />
      <Field
        label="Discount display (e.g. 40%)"
        value={(config.discountLabel as string) ?? ""}
        onChange={(v) => onChange({ ...config, discountLabel: v })}
      />
      <ImageUpload
        label="Banner background image (optional)"
        value={(config.image as string) ?? ""}
        onChange={(url) => onChange({ ...config, image: url })}
        accessToken={accessToken}
        folder="homepage/promo"
        aspectHint="Wide banner: 1600×600px recommended"
      />
      <ProductLinkPicker
        label="Link to product (optional — auto-fills title, image & CTA)"
        value={(config.productLink as string) ?? ""}
        onChange={(v) => onChange({ ...config, productLink: v })}
        accessToken={accessToken}
        hint="Start typing a product name or slug to see suggestions"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="CTA label"
          value={cta?.label ?? ""}
          onChange={(v) => onChange({ ...config, cta: { label: v, href: cta?.href ?? "/products" } })}
        />
        <Field
          label="CTA link"
          value={cta?.href ?? ""}
          onChange={(v) => onChange({ ...config, cta: { label: cta?.label ?? "Shop", href: v } })}
        />
      </div>
    </div>
  );
}

export function NewsletterEditor({ config, onChange }: Omit<EditorProps, "accessToken">) {
  return (
    <div className="space-y-4">
      <Field
        label="Title"
        value={(config.title as string) ?? ""}
        onChange={(v) => onChange({ ...config, title: v })}
      />
      <Field
        label="Subtitle"
        value={(config.subtitle as string) ?? ""}
        onChange={(v) => onChange({ ...config, subtitle: v })}
        multiline
      />
      <Field
        label="Email placeholder"
        value={(config.emailPlaceholder as string) ?? ""}
        onChange={(v) => onChange({ ...config, emailPlaceholder: v })}
      />
      <Field
        label="Button label"
        value={(config.buttonLabel as string) ?? ""}
        onChange={(v) => onChange({ ...config, buttonLabel: v })}
      />
      <Field
        label="Privacy note"
        value={(config.privacyNote as string) ?? ""}
        onChange={(v) => onChange({ ...config, privacyNote: v })}
        multiline
      />
    </div>
  );
}

export function FlashSaleEditor({ config, onChange, accessToken }: EditorProps) {
  const mode = (config.selectionMode as string) ?? "auto";
  const productLinks = (config.productLinks as string[]) ?? [];
  const endsAt = (config.endsAt as string) ?? "";
  const endsAtLocal = endsAt
    ? (() => {
        try {
          const d = new Date(endsAt);
          if (Number.isNaN(d.getTime())) return "";
          const pad = (n: number) => String(n).padStart(2, "0");
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        } catch {
          return "";
        }
      })()
    : "";

  return (
    <div className="space-y-4">
      <Field
        label="Eyebrow"
        value={(config.eyebrow as string) ?? ""}
        onChange={(v) => onChange({ ...config, eyebrow: v })}
      />
      <Field
        label="Title"
        value={(config.title as string) ?? ""}
        onChange={(v) => onChange({ ...config, title: v })}
      />
      <Field
        label="Subtitle"
        value={(config.subtitle as string) ?? ""}
        onChange={(v) => onChange({ ...config, subtitle: v })}
        multiline
      />
      <div className="space-y-1.5">
        <Label>Sale ends at</Label>
        <Input
          type="datetime-local"
          value={endsAtLocal}
          onChange={(e) => {
            const v = e.target.value;
            onChange({
              ...config,
              endsAt: v ? new Date(v).toISOString() : "",
            });
          }}
        />
        <p className="text-[12px] text-muted-foreground">
          Powers the live countdown on the storefront.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="CTA label"
          value={(config.ctaLabel as string) ?? ""}
          onChange={(v) => onChange({ ...config, ctaLabel: v })}
        />
        <Field
          label="CTA link"
          value={(config.ctaHref as string) ?? ""}
          onChange={(v) => onChange({ ...config, ctaHref: v })}
        />
      </div>

      <div className="space-y-2">
        <Label>Product selection</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === "auto" ? "primary" : "outline"}
            onClick={() => onChange({ ...config, selectionMode: "auto" })}
          >
            Auto (featured in catalog)
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "manual" ? "primary" : "outline"}
            onClick={() => onChange({ ...config, selectionMode: "manual" })}
          >
            Manual (pick products)
          </Button>
        </div>
      </div>

      {mode === "auto" ? (
        <Field
          label="Product limit"
          value={String((config.limit as number) ?? 4)}
          onChange={(v) => onChange({ ...config, limit: parseInt(v) || 4 })}
        />
      ) : (
        <LinkListPicker
          label="Flash sale products"
          links={productLinks}
          onChange={(links) =>
            onChange({ ...config, productLinks: links, selectionMode: "manual" })
          }
          accessToken={accessToken}
          type="product"
          hint="Search by name or slug. Order here is display order on the homepage."
        />
      )}
    </div>
  );
}

export function renderSectionEditor(
  type: string,
  props: EditorProps
): React.ReactNode {
  switch (type) {
    case "hero_slider":
      return <HeroSliderEditor {...props} />;
    case "trust_badges":
      return <TrustBadgesEditor config={props.config} onChange={props.onChange} />;
    case "featured_products":
      return <FeaturedProductsEditor {...props} />;
    case "category_showcase":
      return <CategoryShowcaseEditor {...props} />;
    case "promo_banner":
      return <PromoBannerEditor {...props} />;
    case "newsletter":
      return <NewsletterEditor config={props.config} onChange={props.onChange} />;
    case "flash_sale":
      return <FlashSaleEditor {...props} />;
    default:
      return (
        <p className="text-small text-muted-foreground">
          No visual editor for section type &quot;{type}&quot;. Edit raw JSON via API.
        </p>
      );
  }
}
