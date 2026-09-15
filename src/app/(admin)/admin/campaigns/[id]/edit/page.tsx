"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { EmailBuilder } from "@/components/admin/email/builder";
import type { EmailDocument } from "@/lib/email/document-schema";
import { createDefaultEmailDocument, createTextBlock, createButtonBlock, createProductBlock } from "@/lib/email/document-defaults";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ds/button";
import Link from "next/link";

interface EditCampaignPageProps {
  params: Promise<{ id: string }>;
}

export default function EditCampaignPage({ params }: EditCampaignPageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [campaign, setCampaign] = useState<Record<string, unknown> | null>(null);
  const [initialDoc, setInitialDoc] = useState<EmailDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCampaign() {
      try {
        const res = await fetch(`/api/v1/admin/email/campaigns/${id}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to load campaign");
        }

        const camp = data.data?.campaign || data.campaign;
        setCampaign(camp);

        if (camp.emailDocument) {
          setInitialDoc(camp.emailDocument as EmailDocument);
        } else {
          // Convert flat legacy campaign fields into EmailDocument
          const doc = createDefaultEmailDocument(camp.subject || "");
          doc.previewText = camp.previewText || "";
          doc.sections = [];

          if (camp.headline) {
            doc.sections.push(createTextBlock({ text: camp.headline, headingLevel: "h1", fontSize: 26, fontWeight: 700 }));
          }
          if (camp.body) {
            doc.sections.push(createTextBlock({ text: camp.body }));
          }
          if (camp.productSnapshot) {
            doc.sections.push(
              createProductBlock(
                camp.productId || "prod_1",
                camp.productSnapshot,
                "image-top",
                { ctaText: camp.ctaText || "Shop Now", ctaUrl: camp.ctaUrl }
              )
            );
          } else if (camp.ctaText && camp.ctaUrl) {
            doc.sections.push(createButtonBlock({ text: camp.ctaText, url: camp.ctaUrl }));
          }

          setInitialDoc(doc);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load campaign");
      } finally {
        setLoading(false);
      }
    }

    loadCampaign();
  }, [id]);

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-medium">Loading Campaign Designer...</p>
      </div>
    );
  }

  if (error || !initialDoc) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 text-gray-700 p-6 text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
        <h3 className="text-base font-bold text-gray-900 mb-1">Unable to Edit Campaign</h3>
        <p className="text-xs text-gray-500 max-w-sm mb-4">{error || "Campaign could not be found."}</p>
        <Button size="sm" asChild>
          <Link href="/admin/campaigns">Back to Campaigns</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 left-0 md:left-64 z-30 bg-gray-100 flex flex-col overflow-hidden">
      <EmailBuilder
        initialDocument={initialDoc}
        campaignId={id}
        onContinueToSend={(_doc) => {
          router.push(`/admin/campaigns/${id}`);
        }}
      />
    </div>
  );
}
