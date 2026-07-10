"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import {
  Search,
  ShoppingCart,
  User,
  Heart,
  Menu,
  GitCompareArrows,
  ChevronDown,
  X,
} from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { useAuthStore } from "@/stores/auth-store";
import { useWishlistStore } from "@/stores/wishlist-store";
import { useCompareStore } from "@/stores/compare-store";
import { Button } from "@/components/ds/button";
import { SearchAutocomplete } from "@/components/storefront/search/SearchAutocomplete";
import { RegionSelector } from "@/components/storefront/layout/RegionSelector";
import { ThemeToggle } from "@/components/storefront/layout/ThemeToggle";
import { cn } from "@/components/ds/utils";
import type { SiteSettingsPublic } from "@/types";
import { useClientMounted } from "@/hooks/use-client-mounted";

interface Category {
  _id: string;
  name: string;
  slug: string;
}

interface HeaderProps {
  settings: SiteSettingsPublic | null;
}

export function Header({ settings }: HeaderProps) {
  const t = useTranslations();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const mounted = useClientMounted();
  const itemCount = useCartStore((s) =>
    s.items.reduce((sum, i) => sum + i.quantity, 0)
  );
  const displayItemCount = mounted ? itemCount : 0;
  const [cartPulse, setCartPulse] = useState(false);
  const prevCountRef = useRef(displayItemCount);

  useEffect(() => {
    if (!mounted) return;
    if (itemCount > prevCountRef.current) {
      setCartPulse(true);
      const tmr = setTimeout(() => setCartPulse(false), 700);
      prevCountRef.current = itemCount;
      return () => clearTimeout(tmr);
    }
    prevCountRef.current = itemCount;
  }, [itemCount, mounted]);
  const wishlistCount = useWishlistStore((s) => s.items.length);
  const displayWishlistCount = mounted ? wishlistCount : 0;
  const compareCount = useCompareStore((s) => s.productIds.length);
  const displayCompareCount = mounted ? compareCount : 0;
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    fetch("/api/v1/categories")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setCategories(d.data ?? []);
      })
      .catch(() => {});
  }, []);

  const navItems = settings?.navigation?.length
    ? settings.navigation
    : [
        { label: t("nav.newArrivals"), href: "/new-arrivals" },
        { label: t("nav.bestSellers"), href: "/bestsellers" },
        { label: t("nav.categories"), href: "/categories" },
        { label: t("nav.deals"), href: "/deals" },
      ];

  return (
    <>
      <header id="site-header" className="sticky top-0 z-50 bg-background/95 backdrop-blur-md">
        {/* Top bar — locale, theme, secondary actions */}
        <div className="hidden border-b border-border sm:block">
          <div className="container-store flex h-9 items-center justify-between gap-4">
            <p className="truncate text-[12px] text-muted-foreground">
              {settings?.announcement ?? settings?.deliveryInfo}
            </p>
            <div className="flex shrink-0 items-center gap-1">
              <RegionSelector compact />
              <div className="mx-1 h-4 w-px bg-border" />
              <ThemeToggle />
              <TopBarIcon href="/wishlist" label={t("header.wishlist")} count={displayWishlistCount}>
                <Heart className="h-3.5 w-3.5" />
              </TopBarIcon>
              <TopBarIcon href="/compare" label={t("compare.title")} count={displayCompareCount}>
                <GitCompareArrows className="h-3.5 w-3.5" />
              </TopBarIcon>
            </div>
          </div>
        </div>

        {/* Main navbar — logo, nav, search, cart, account */}
        <div className="border-b border-border">
          <div className="container-store">
            <div className="flex h-14 items-center gap-3 md:h-16 md:gap-4">
              <Button
                variant="ghost"
                size="icon-sm"
                className="lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Menu"
              >
                <Menu className="h-5 w-5" />
              </Button>

              <Link href="/" className="flex shrink-0 items-center">
                {settings?.logo ? (
                  <Image
                    src={settings.logo}
                    alt={t("common.brand")}
                    width={120}
                    height={32}
                    className="h-7 w-auto md:h-8"
                    priority
                  />
                ) : (
                  <span className="text-body font-bold tracking-tight">{t("common.brand")}</span>
                )}
              </Link>

              <nav className="hidden items-center lg:flex">
                <div
                  className="relative"
                  onMouseEnter={() => setMegaOpen(true)}
                  onMouseLeave={() => setMegaOpen(false)}
                >
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-[var(--radius-sm)] px-3 py-2 text-small font-medium transition-colors hover:bg-secondary"
                  >
                    {t("nav.categories")}
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                  </button>
                  {megaOpen && categories.length > 0 && (
                    <div className="absolute left-0 top-full z-50 pt-2">
                      <div className="w-[420px] rounded-[var(--radius-md)] border border-border bg-popover p-5 shadow-[var(--shadow-card)]">
                        <div className="grid grid-cols-2 gap-1">
                          {categories.slice(0, 8).map((cat) => (
                            <Link
                              key={cat._id}
                              href={`/categories/${cat.slug}`}
                              className="rounded-[var(--radius-sm)] px-3 py-2 text-small transition-colors hover:bg-secondary"
                              onClick={() => setMegaOpen(false)}
                            >
                              {cat.name}
                            </Link>
                          ))}
                        </div>
                        <div className="mt-3 border-t border-border pt-3">
                          <Link
                            href="/products"
                            className="text-small font-medium text-primary"
                            onClick={() => setMegaOpen(false)}
                          >
                            {t("nav.allProducts")} →
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-[var(--radius-sm)] px-3 py-2 text-small font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="mx-auto hidden max-w-md flex-1 md:flex lg:max-w-lg">
                <SearchAutocomplete
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onSubmit={() => setMobileOpen(false)}
                  placeholder={t("common.search")}
                  size="md"
                />
              </div>

              <div className="ml-auto flex items-center gap-0.5">
                <Button variant="ghost" size="icon-sm" className="md:hidden" asChild>
                  <Link href="/products?q=" aria-label={t("common.search")}>
                    <Search className="h-[18px] w-[18px]" />
                  </Link>
                </Button>
                <NavIcon
                  href="/cart"
                  label={t("header.cart")}
                  count={displayItemCount}
                  pulse={cartPulse}
                >
                  <ShoppingCart className="h-[18px] w-[18px]" />
                </NavIcon>
                <Button variant="ghost" size="icon-sm" asChild>
                  <Link href={user ? "/account" : "/login"} aria-label={t("header.account")}>
                    <User className="h-[18px] w-[18px]" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile announcement strip */}
        {settings?.announcement && (
          <div className="border-b border-border bg-secondary px-4 py-2 text-center sm:hidden">
            <p className="truncate text-[11px] text-muted-foreground">{settings.announcement}</p>
          </div>
        )}
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-[min(320px,88vw)] flex-col bg-background shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between border-b border-border p-4">
              <span className="font-semibold">{t("common.brand")}</span>
              <Button variant="ghost" size="icon-sm" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="border-b border-border p-4">
              <SearchAutocomplete
                value={searchQuery}
                onChange={setSearchQuery}
                onSubmit={() => setMobileOpen(false)}
                placeholder={t("common.search")}
                size="md"
              />
            </div>
            <nav className="flex-1 overflow-y-auto p-4">
              <p className="mb-2 text-small font-semibold text-muted-foreground">
                {t("nav.categories")}
              </p>
              {categories.map((cat) => (
                <Link
                  key={cat._id}
                  href={`/categories/${cat.slug}`}
                  className="block rounded-[var(--radius-sm)] px-3 py-2.5 text-small font-medium hover:bg-secondary"
                  onClick={() => setMobileOpen(false)}
                >
                  {cat.name}
                </Link>
              ))}
              <div className="my-3 h-px bg-border" />
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-[var(--radius-sm)] px-3 py-2.5 text-small font-medium hover:bg-secondary"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <div className="my-3 h-px bg-border" />
              <Link
                href="/wishlist"
                className="flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2.5 text-small hover:bg-secondary"
                onClick={() => setMobileOpen(false)}
              >
                <Heart className="h-4 w-4" /> {t("header.wishlist")}
                {displayWishlistCount > 0 && (
                  <span className="ml-auto rounded-full bg-primary px-1.5 text-[10px] text-white">
                    {displayWishlistCount}
                  </span>
                )}
              </Link>
              <Link
                href="/compare"
                className="flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2.5 text-small hover:bg-secondary"
                onClick={() => setMobileOpen(false)}
              >
                <GitCompareArrows className="h-4 w-4" /> {t("compare.title")}
              </Link>
            </nav>
            <div className="border-t border-border p-4">
              <RegionSelector />
              <div className="mt-3 flex items-center justify-between">
                <span className="text-small text-muted-foreground">Theme</span>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TopBarIcon({
  href,
  label,
  count,
  children,
}: {
  href: string;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="relative flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      {children}
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

function NavIcon({
  href,
  label,
  count,
  children,
  pulse,
}: {
  href: string;
  label: string;
  count: number;
  children: React.ReactNode;
  pulse?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={cn("relative", pulse && "animate-[cart-pop_0.55s_ease]")}
      asChild
    >
      <Link href={href} aria-label={label}>
        {children}
        {count > 0 && (
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white transition-transform",
              pulse && "scale-125"
            )}
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>
    </Button>
  );
}
