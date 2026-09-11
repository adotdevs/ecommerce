"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Layout,
  FileText,
  Sparkles,
  ExternalLink,
  Edit,
  Copy,
  Check,
  Plus,
  Flame,
  Crown,
  Grid,
  Heart,
  Newspaper,
  Loader2,
  Tag,
  Calendar,
  Layers,
} from "lucide-react";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ds/modal";
import { Button } from "@/components/ds/button";
import {
  STARTER_TEMPLATES,
  STARTER_SIMPLE_TEMPLATES,
  createSimpleEmailDocument,
  type StarterTemplate,
  type StarterSimpleTemplate,
} from "@/lib/email/document-defaults";
import type { EmailDocument } from "@/lib/email/document-schema";

export interface SelectedTemplateResult {
  templateId?: string;
  name: string;
  templateType: "visual" | "simple";
  subject: string;
  emailDocument: EmailDocument;
  bodyText?: string;
}

interface TemplateSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (result: SelectedTemplateResult) => void;
}

interface SavedTemplateItem {
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

export function TemplateSelectorModal({
  open,
  onOpenChange,
  onSelectTemplate,
}: TemplateSelectorModalProps) {
  const [activeTab, setActiveTab] = useState<"all" | "visual" | "simple">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  // Fetch saved templates when opened
  useEffect(() => {
    if (!open) return;
    let isMounted = true;
    setLoading(true);

    fetch("/api/v1/admin/email/templates")
      .then((res) => res.json())
      .then((data) => {
        const list = data.templates || data.data?.templates;
        if (isMounted && Array.isArray(list)) {
          setSavedTemplates(list);
        }
      })
      .catch((err) => {
        console.error("Failed to load templates:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open]);

  // Handle duplicate template
  const handleDuplicate = async (e: React.MouseEvent, template: SavedTemplateItem) => {
    e.preventDefault();
    e.stopPropagation();
    setDuplicatingId(template._id);
    try {
      const res = await fetch(`/api/v1/admin/email/templates/${template._id}`, {
        method: "POST",
      });
      const data = await res.json();
      const newTpl = data.template || data.data?.template;
      if (res.ok && newTpl) {
        setSavedTemplates((prev) => [newTpl, ...prev]);
      }
    } catch (err) {
      console.error("Failed to duplicate template:", err);
    } finally {
      setDuplicatingId(null);
    }
  };

  // Filter saved templates
  const filteredSaved = useMemo(() => {
    return savedTemplates.filter((tpl) => {
      const matchesType =
        activeTab === "all" ? true : tpl.templateType === activeTab;
      if (!matchesType) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const inName = tpl.name?.toLowerCase().includes(q);
      const inSubject = tpl.subject?.toLowerCase().includes(q);
      const inTags = tpl.tags?.some((t) => t.toLowerCase().includes(q));
      return inName || inSubject || inTags;
    });
  }, [savedTemplates, activeTab, searchQuery]);

  // Filter starter visual templates
  const filteredStarterVisual = useMemo(() => {
    if (activeTab === "simple") return [];
    return STARTER_TEMPLATES.filter((tpl) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        tpl.name.toLowerCase().includes(q) ||
        tpl.description.toLowerCase().includes(q) ||
        tpl.category.toLowerCase().includes(q)
      );
    });
  }, [activeTab, searchQuery]);

  // Filter starter simple templates
  const filteredStarterSimple = useMemo(() => {
    if (activeTab === "visual") return [];
    return STARTER_SIMPLE_TEMPLATES.filter((tpl) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        tpl.name.toLowerCase().includes(q) ||
        tpl.description.toLowerCase().includes(q) ||
        tpl.subject.toLowerCase().includes(q) ||
        tpl.category.toLowerCase().includes(q)
      );
    });
  }, [activeTab, searchQuery]);

  const handleSelectSaved = (tpl: SavedTemplateItem, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    let doc = tpl.emailDocument;
    if (!doc && tpl.templateType === "simple") {
      doc = createSimpleEmailDocument(tpl.subject || tpl.name, tpl.bodyTemplate || "");
    }
    if (!doc) return;

    onSelectTemplate({
      templateId: tpl._id,
      name: tpl.name,
      templateType: tpl.templateType || "visual",
      subject: tpl.subject || doc.subject || tpl.name,
      emailDocument: doc,
      bodyText: tpl.bodyTemplate,
    });
    onOpenChange(false);
  };

  const handleSelectStarterVisual = (tpl: StarterTemplate, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onSelectTemplate({
      name: tpl.name,
      templateType: "visual",
      subject: tpl.document.subject,
      emailDocument: tpl.document,
    });
    onOpenChange(false);
  };

  const handleSelectStarterSimple = (tpl: StarterSimpleTemplate, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const doc = createSimpleEmailDocument(tpl.subject, tpl.bodyText, {
      previewText: tpl.previewText,
      buttonText: tpl.buttonText,
      buttonUrl: tpl.buttonUrl,
      signOff: tpl.signOff,
    });

    onSelectTemplate({
      name: tpl.name,
      templateType: "simple",
      subject: tpl.subject,
      emailDocument: doc,
      bodyText: tpl.bodyText,
    });
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-4xl p-0 overflow-hidden flex flex-col max-h-[85vh] bg-slate-50 font-sans">
        {/* Header */}
        <ModalHeader className="px-6 py-4 bg-white border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <ModalTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                Select Email Template
              </ModalTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Choose from your saved templates or launch a pre-built designer template.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/admin/campaigns/templates/new?type=simple"
                target="_blank"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Simple</span>
              </Link>
              <Link
                href="/admin/campaigns/templates/new?type=visual"
                target="_blank"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Visual</span>
              </Link>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search templates or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none transition"
              />
            </div>

            {/* Type Filter Tabs */}
            <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200 self-stretch sm:self-auto justify-center">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1 rounded text-xs font-medium transition ${
                  activeTab === "all"
                    ? "bg-white text-gray-900 shadow-xs font-semibold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                All ({savedTemplates.length + STARTER_TEMPLATES.length + STARTER_SIMPLE_TEMPLATES.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("visual")}
                className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-medium transition ${
                  activeTab === "visual"
                    ? "bg-white text-indigo-700 shadow-xs font-semibold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Layout className="w-3.5 h-3.5" />
                <span>Visual</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("simple")}
                className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-medium transition ${
                  activeTab === "simple"
                    ? "bg-white text-amber-800 shadow-xs font-semibold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Simple</span>
              </button>
            </div>
          </div>
        </ModalHeader>

        {/* Scrollable Gallery Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: User's Saved Templates */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>My Saved Templates</span>
                <span className="bg-gray-200 text-gray-700 rounded-full px-2 py-0.2 text-[10px] font-semibold">
                  {filteredSaved.length}
                </span>
              </h3>
              <Link
                href="/admin/campaigns/templates"
                target="_blank"
                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium"
              >
                <span>Manage Templates</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-8 bg-white rounded-xl border border-gray-200">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600 mr-2" />
                <span className="text-xs text-gray-500 font-medium">Loading templates...</span>
              </div>
            ) : filteredSaved.length === 0 ? (
              <div className="p-6 bg-white rounded-xl border border-dashed border-gray-300 text-center">
                <p className="text-xs text-gray-500">
                  {searchQuery
                    ? "No saved templates match your search."
                    : "You haven't saved any custom templates yet. You can use the presets below or save your current campaign layout as a template."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredSaved.map((tpl) => (
                  <div
                    key={tpl._id}
                    onClick={(e) => handleSelectSaved(tpl, e)}
                    className="group bg-white rounded-xl border border-gray-200 hover:border-indigo-500 hover:shadow-md transition cursor-pointer p-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${
                            tpl.templateType === "simple"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-indigo-100 text-indigo-800 border border-indigo-200"
                          }`}
                        >
                          {tpl.templateType === "simple" ? "Simple / Text" : "Visual Studio"}
                        </span>

                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={(e) => handleDuplicate(e, tpl)}
                            title="Duplicate Template"
                            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700 transition"
                          >
                            {duplicatingId === tpl._id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <Link
                            href={`/admin/campaigns/templates/${tpl._id}/edit`}
                            target="_blank"
                            onClick={(e) => e.stopPropagation()}
                            title="Edit Template in New Tab"
                            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-indigo-600 transition"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>

                      <h4 className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition line-clamp-1">
                        {tpl.name}
                      </h4>

                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {tpl.subject || "No subject specified"}
                      </p>

                      {tpl.tags && tpl.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {tpl.tags.slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                      <span>{tpl.updatedAt ? new Date(tpl.updatedAt).toLocaleDateString() : "Saved"}</span>
                      <span className="font-semibold text-indigo-600 group-hover:underline flex items-center gap-0.5">
                        Use Template →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Designer Starter Presets (Visual) */}
          {filteredStarterVisual.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Designer Visual Templates</span>
                  <span className="bg-indigo-100 text-indigo-800 rounded-full px-2 py-0.2 text-[10px] font-semibold">
                    {filteredStarterVisual.length}
                  </span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredStarterVisual.map((preset) => (
                  <div
                    key={preset.id}
                    onClick={(e) => handleSelectStarterVisual(preset, e)}
                    className="group bg-white rounded-xl border border-gray-200 hover:border-indigo-500 hover:shadow-md transition cursor-pointer p-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide bg-slate-100 text-slate-700">
                          {preset.category}
                        </span>
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: preset.previewColor }}
                        />
                      </div>

                      <h4 className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition line-clamp-1">
                        {preset.name}
                      </h4>

                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {preset.description}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                      <span>{preset.document.sections.length} blocks</span>
                      <span className="font-semibold text-indigo-600 group-hover:underline flex items-center gap-0.5">
                        Apply Layout →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Designer Starter Presets (Simple / Personal Outreach) */}
          {filteredStarterSimple.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-600" />
                  <span>Starter Simple & Personal Templates</span>
                  <span className="bg-amber-100 text-amber-800 rounded-full px-2 py-0.2 text-[10px] font-semibold">
                    {filteredStarterSimple.length}
                  </span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredStarterSimple.map((preset) => (
                  <div
                    key={preset.id}
                    onClick={(e) => handleSelectStarterSimple(preset, e)}
                    className="group bg-white rounded-xl border border-gray-200 hover:border-amber-500 hover:shadow-md transition cursor-pointer p-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide bg-amber-50 text-amber-800 border border-amber-200">
                          {preset.category}
                        </span>
                        <FileText className="w-3.5 h-3.5 text-amber-600" />
                      </div>

                      <h4 className="text-sm font-bold text-gray-900 group-hover:text-amber-700 transition line-clamp-1">
                        {preset.name}
                      </h4>

                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {preset.description}
                      </p>

                      <div className="mt-2 text-[11px] font-mono text-gray-500 bg-gray-50 p-1.5 rounded border border-gray-100 line-clamp-1">
                        Subject: {preset.subject}
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                      <span>High-Deliverability Text</span>
                      <span className="font-semibold text-amber-700 group-hover:underline flex items-center gap-0.5">
                        Apply Template →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}
