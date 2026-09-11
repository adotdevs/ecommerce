"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertCircle, Save, Check } from "lucide-react";
import { Button } from "@/components/ds/button";
import { SimpleTemplateEditor } from "@/components/admin/email/SimpleTemplateEditor";
import { EmailBuilder } from "@/components/admin/email/builder/EmailBuilder";
import type { EmailDocument } from "@/lib/email/document-schema";

interface FetchedTemplate {
  _id: string;
  name: string;
  description?: string;
  subject?: string;
  templateType: "visual" | "simple";
  tags?: string[];
  emailDocument?: EmailDocument;
  previewHtml?: string;
  bodyTemplate?: string;
  updatedAt?: string;
}

export default function EditTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [template, setTemplate] = useState<FetchedTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingVisual, setSavingVisual] = useState(false);

  const fetchTemplate = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/v1/admin/email/templates/${id}`);
      const data = await res.json();
      const tpl = data.template || data.data?.template;
      if (!res.ok || !tpl) {
        throw new Error(data.message || data.error || "Template not found");
      }
      setTemplate(tpl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load template");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 gap-3 font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="text-xs font-semibold text-gray-500">Loading email template...</span>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 p-6 font-sans">
        <div className="max-w-md w-full bg-white p-6 rounded-xl border border-gray-200 text-center space-y-4 shadow-sm">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-lg font-bold text-gray-900">Failed to Load Template</h2>
          <p className="text-xs text-gray-500">{error || "The requested template could not be found."}</p>
          <div className="pt-2">
            <Button variant="secondary" size="sm" asChild>
              <Link href="/admin/campaigns/templates">
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                Back to Templates
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // If Simple Template
  if (template.templateType === "simple") {
    // Extract button or sign-off from emailDocument if present
    const buttonSection = template.emailDocument?.sections?.find((s) => s.type === "button");
    const buttonContent = buttonSection?.content as any;

    return (
      <SimpleTemplateEditor
        templateId={template._id}
        initialData={{
          name: template.name,
          subject: template.subject || template.emailDocument?.subject || "",
          previewText: template.emailDocument?.previewText || "",
          bodyText:
            template.bodyTemplate ||
            (template.emailDocument?.sections?.find((s) => s.type === "text")?.content as any)?.text ||
            "",
          buttonText: buttonContent?.text,
          buttonUrl: buttonContent?.url,
          tags: template.tags || [],
          templateType: "simple",
        }}
        backUrl="/admin/campaigns/templates"
      />
    );
  }

  // If Visual Studio Template
  const handleSaveVisual = async (doc: EmailDocument) => {
    setSavingVisual(true);
    try {
      const res = await fetch(`/api/v1/admin/email/templates/${template._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: template.name,
          subjectTemplate: doc.subject,
          previewTextTemplate: doc.previewText,
          emailDocument: doc,
          templateType: "visual",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update visual template");
      router.push("/admin/campaigns/templates");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error saving template");
    } finally {
      setSavingVisual(false);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden font-sans">
      <EmailBuilder
        templateId={template._id}
        initialDocument={template.emailDocument}
        onContinueToSend={handleSaveVisual}
        isSavingCampaign={savingVisual}
        backUrl="/admin/campaigns/templates"
      />
    </div>
  );
}
