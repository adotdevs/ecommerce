import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getLocalizedCmsPage } from "@/lib/cms/cms-page-content";
import { isCmsPageSlug } from "@/lib/cms/cms-pages";
import { CmsPageView } from "@/components/storefront/cms/CmsPageView";
import type { Locale } from "@/config/locales";

interface PageProps {
  params: Promise<{ slug: string; locale: Locale }>;
}

function readPrefCookie(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  name: string
): string | undefined {
  const raw = cookieStore.get(name)?.value;
  if (!raw) return undefined;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

async function deliverToCountry() {
  const cookieStore = await cookies();
  return (
    readPrefCookie(cookieStore, "preferred-country") ??
    readPrefCookie(cookieStore, "country-detected")
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  if (!isCmsPageSlug(slug)) return { title: "Page Not Found" };

  const page = await getLocalizedCmsPage(slug, locale, await deliverToCountry());
  if (!page) return { title: "Page Not Found" };

  return {
    title: page.seo.title,
    description: page.seo.description,
  };
}

export default async function CmsDynamicPage({ params }: PageProps) {
  const { slug, locale } = await params;
  if (!isCmsPageSlug(slug)) notFound();

  const page = await getLocalizedCmsPage(slug, locale, await deliverToCountry());
  if (!page) notFound();

  return (
    <div className="container-store py-10 md:py-14">
      <CmsPageView slug={slug} content={page.content} />
    </div>
  );
}
