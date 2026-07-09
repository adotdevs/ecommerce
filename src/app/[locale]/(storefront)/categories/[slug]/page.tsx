import type { Metadata } from "next";
import type { Locale } from "@/config/locales";
import { connectDB } from "@/lib/db/mongoose";
import { Brand, Category } from "@/models";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ds/button";
import { ProductCard } from "@/components/storefront/products/ProductCard";
import { CatalogFilters } from "@/components/storefront/catalog/CatalogFilters";
import { queryCatalogProducts } from "@/lib/catalog/query";
import type { CatalogSearchParams } from "@/lib/catalog/render-page";
import { cn } from "@/components/ds/utils";

interface PageProps {
  params: Promise<{ locale: Locale; slug: string }>;
  searchParams: Promise<CatalogSearchParams>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  await connectDB();
  const { slug } = await params;
  const category = await Category.findOne({ slug }).lean();
  if (!category) return { title: "Category" };
  return {
    title: category.seo?.title || category.name,
    description: category.seo?.description || category.description,
  };
}

export default async function CategoryDetailPage({ params, searchParams }: PageProps) {
  await connectDB();
  const { slug } = await params;
  const sp = await searchParams;
  const category = await Category.findOne({ slug }).lean();
  if (!category) notFound();

  const page = parseInt(sp.page ?? "1", 10) || 1;
  const [brands, result] = await Promise.all([
    Brand.find({ categoryIds: category._id })
      .sort({ name: 1 })
      .select("name slug logo")
      .lean(),
    queryCatalogProducts({
      page,
      limit: 12,
      category: category.name,
      q: sp.q,
      sort: sp.sort,
      brand: sp.brand,
      minPrice: sp.minPrice ? Number(sp.minPrice) : undefined,
      maxPrice: sp.maxPrice ? Number(sp.maxPrice) : undefined,
      onSale: sp.onSale === "1",
      featured: sp.featured === "1",
    }),
  ]);

  const qs = new URLSearchParams();
  Object.entries(sp).forEach(([k, v]) => {
    if (v && k !== "page") qs.set(k, v);
  });

  return (
    <div className="pb-16 md:pb-20">
      <section className="relative overflow-hidden border-b border-border">
        {category.image ? (
          <div className="absolute inset-0">
            <Image
              src={category.image}
              alt=""
              fill
              className="object-cover opacity-35 dark:opacity-25"
              sizes="100vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/92 to-background/75" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/12 via-background to-secondary dark:from-primary/18 dark:to-secondary/40" />
        )}
        <div className="container-store relative py-12 md:py-16">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
            <Link href="/categories" className="hover:text-foreground">
              Categories
            </Link>
            <span>/</span>
            <span className="text-foreground">{category.name}</span>
          </div>
          <span className="mb-3 inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
            <Sparkles className="h-3 w-3" />
            Collection
          </span>
          <h1 className="text-[clamp(1.9rem,4vw,2.75rem)] font-bold tracking-tight text-foreground">
            {category.name}
          </h1>
          {category.description && (
            <p className="mt-3 max-w-2xl text-body text-muted-foreground">
              {category.description}
            </p>
          )}

          {brands.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Brands in this category
              </p>
              <div className="flex flex-wrap gap-2">
                {brands.map((b) => (
                  <Link
                    key={String(b._id)}
                    href={`/categories/${slug}?brand=${encodeURIComponent(b.name)}`}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 text-[12px] font-medium text-foreground backdrop-blur-sm transition hover:border-primary/40"
                  >
                    {b.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.logo} alt="" className="h-4 w-4 rounded object-contain" />
                    ) : null}
                    {b.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <Button asChild variant="outline" size="sm" className="mt-6">
            <Link href="/categories">
              All categories <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </section>

      <div className="container-store pt-8 md:pt-10">
        <CatalogFilters
          facets={{
            ...result.facets,
            brands: brands.map((b) => ({ name: b.name, slug: b.slug })),
          }}
          total={result.total}
          accent="indigo"
          hideCategoryFilter
        >
          {result.products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-20 text-center">
              <p className="text-lg font-semibold text-foreground">No products in this collection</p>
              <p className="mt-2 text-body text-muted-foreground">
                Try another brand filter or browse all categories.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5">
                {result.products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
              {result.pages > 1 && (
                <div className="mt-10 flex items-center justify-center gap-2">
                  {Array.from({ length: result.pages }, (_, i) => i + 1)
                    .filter(
                      (p) =>
                        p === 1 ||
                        p === result.pages ||
                        Math.abs(p - result.page) <= 2
                    )
                    .map((p, idx, arr) => {
                      const prev = arr[idx - 1];
                      const showEllipsis = prev != null && p - prev > 1;
                      const nextQs = new URLSearchParams(qs.toString());
                      nextQs.set("page", String(p));
                      return (
                        <span key={p} className="flex items-center gap-2">
                          {showEllipsis && (
                            <span className="text-muted-foreground">…</span>
                          )}
                          <Link
                            href={`/categories/${slug}?${nextQs.toString()}`}
                            className={cn(
                              "flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-small font-medium transition",
                              p === result.page
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card text-foreground hover:bg-secondary"
                            )}
                          >
                            {p}
                          </Link>
                        </span>
                      );
                    })}
                </div>
              )}
            </>
          )}
        </CatalogFilters>
      </div>
    </div>
  );
}
