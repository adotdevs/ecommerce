import { connectDB } from "@/lib/db/mongoose";
import { CmsPage } from "@/models";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  await connectDB();
  const { slug } = await params;
  const page = await CmsPage.findOne({ slug, status: "published" }).lean();
  if (!page) return { title: "Page Not Found" };
  return {
    title: page.seo?.title ?? page.title,
    description: page.seo?.description,
  };
}

export default async function CmsDynamicPage({ params }: PageProps) {
  await connectDB();
  const { slug } = await params;
  const page = await CmsPage.findOne({ slug, status: "published" }).lean();
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-8 text-4xl font-bold">{page.title}</h1>
      <div className="space-y-8">
        {page.blocks.map((block) => {
          if (block.type === "hero") {
            const config = block.config as { title?: string; subtitle?: string };
            return (
              <div key={block.id} className="rounded-2xl bg-secondary p-10 text-center">
                <h2 className="text-2xl font-bold">{config.title}</h2>
                {config.subtitle && (
                  <p className="mt-2 text-muted-foreground">{config.subtitle}</p>
                )}
              </div>
            );
          }
          if (block.type === "text") {
            const config = block.config as { content?: string };
            return (
              <p key={block.id} className="leading-relaxed text-muted-foreground">
                {config.content}
              </p>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}
