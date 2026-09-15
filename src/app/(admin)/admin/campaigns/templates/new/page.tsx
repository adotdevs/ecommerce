"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Layers,
  Layout,
  FileText,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Zap,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ds/button";
import { SimpleTemplateEditor } from "@/components/admin/email/SimpleTemplateEditor";
import { EmailBuilder } from "@/components/admin/email/builder/EmailBuilder";
import { createDefaultEmailDocument } from "@/lib/email/document-defaults";
import type { EmailDocument } from "@/lib/email/document-schema";

function TemplateCreatorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const typeParam = searchParams.get("type");

  const [savingVisual, setSavingVisual] = useState(false);

  // If Simple template selected
  if (typeParam === "simple") {
    return <SimpleTemplateEditor backUrl="/admin/campaigns/templates" />;
  }

  // If Visual template selected
  if (typeParam === "visual") {
    const handleSaveVisualTemplate = async (doc: EmailDocument) => {
      setSavingVisual(true);
      try {
        const name = prompt("Enter a name for this visual template:", doc.subject || "Custom Visual Template");
        if (!name) {
          setSavingVisual(false);
          return;
        }

        const res = await fetch("/api/v1/admin/email/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            subjectTemplate: doc.subject,
            previewTextTemplate: doc.previewText,
            emailDocument: doc,
            templateType: "visual",
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Failed to save template");
        }

        router.push("/admin/campaigns/templates");
      } catch (err) {
        alert(err instanceof Error ? err.message : "Error saving template");
      } finally {
        setSavingVisual(false);
      }
    };

    return (
      <div className="h-screen w-full flex flex-col overflow-hidden">
        <EmailBuilder
          initialDocument={createDefaultEmailDocument("New Visual Template")}
          onContinueToSend={handleSaveVisualTemplate}
          isSavingCampaign={savingVisual}
          backUrl="/admin/campaigns/templates"
        />
      </div>
    );
  }

  // Choose template type screen
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 font-sans">
      <div className="max-w-3xl w-full space-y-8">
        <div className="flex items-center gap-2">
          <Link
            href="/admin/campaigns/templates"
            className="text-xs font-semibold text-gray-500 hover:text-gray-800 flex items-center gap-1.5 transition bg-white px-3 py-1.5 rounded-lg border border-gray-200"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Templates
          </Link>
        </div>

        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
            <Sparkles className="w-3.5 h-3.5" />
            Choose Template Format
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            What kind of template would you like to build?
          </h1>
          <p className="text-sm text-gray-500 max-w-lg mx-auto">
            Choose between rich visual drag-and-drop designer blocks or clean, personal plain-text outreach notes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {/* Visual Studio Card */}
          <div
            onClick={() => router.push("/admin/campaigns/templates/new?type=visual")}
            className="group relative bg-white rounded-2xl border-2 border-gray-200 hover:border-indigo-600 hover:shadow-xl transition-all duration-200 p-6 flex flex-col justify-between cursor-pointer overflow-hidden"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition duration-200">
                <Layout className="w-6 h-6" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition">
                    Visual Studio Template
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                    Designer
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                  Best for seasonal promotions, product catalogs, flash sales, and brand announcements with high visual impact.
                </p>
              </div>

              <ul className="space-y-2 pt-2 border-t border-gray-100 text-xs text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Full drag-and-drop 14+ block studio</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Interactive product cards & multi-column grids</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Live countdown timers & coupon badges</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>AI design generator & color palettes</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-4 flex items-center justify-between text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition duration-150">
              <span>Launch Visual Studio</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Simple & Personal Card */}
          <div
            onClick={() => router.push("/admin/campaigns/templates/new?type=simple")}
            className="group relative bg-white rounded-2xl border-2 border-gray-200 hover:border-amber-600 hover:shadow-xl transition-all duration-200 p-6 flex flex-col justify-between cursor-pointer overflow-hidden"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition duration-200">
                <FileText className="w-6 h-6" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-amber-600 transition">
                    Simple & Personal Template
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                    High-Open Rate
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                  Best for founder notes, VIP private invitations, lead re-engagement, and conversational 1-on-1 personal emails.
                </p>
              </div>

              <ul className="space-y-2 pt-2 border-t border-gray-100 text-xs text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Clean, distraction-free markdown/text editor</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Dynamic personalization tokens (&#123;&#123;firstName&#125;&#125;)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Optional call-to-action button & custom sign-off</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Maximum inbox placement (avoids promotions tab)</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-4 flex items-center justify-between text-xs font-bold text-amber-700 group-hover:translate-x-1 transition duration-150">
              <span>Create Simple Template</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewTemplatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-slate-50">
          <div className="text-xs text-gray-500 font-semibold">Loading template builder...</div>
        </div>
      }
    >
      <TemplateCreatorContent />
    </Suspense>
  );
}
