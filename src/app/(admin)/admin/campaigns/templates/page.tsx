"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Layers,
  Layout,
  FileText,
  Plus,
  Search,
  Edit,
  Copy,
  Trash2,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Send,
  Loader2,
  Check,
  AlertTriangle,
  Flame,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ds/button";
import { Card, CardContent } from "@/components/ds/card";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ds/modal";
import {
  STARTER_TEMPLATES,
  STARTER_SIMPLE_TEMPLATES,
  createSimpleEmailDocument,
} from "@/lib/email/document-defaults";
import type { EmailDocument } from "@/lib/email/document-schema";

interface TemplateItem {
  _id: string;
  name: string;
  description?: string;
  subject?: string;
  templateType: "visual" | "simple";
  tags?: string[];
  emailDocument?: EmailDocument;
  previewHtml?: string;
  bodyTemplate?: string;
  updatedAt: string;
  createdAt: string;
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "visual" | "simple">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<TemplateItem | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/admin/email/templates");
      const data = await res.json();
      const list = data.templates || data.data?.templates;
      if (Array.isArray(list)) {
        setTemplates(list);
      }
    } catch (err) {
      console.error("Failed to load email templates:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleDuplicate = async (tpl: TemplateItem) => {
    setDuplicatingId(tpl._id);
    try {
      const res = await fetch(`/api/v1/admin/email/templates/${tpl._id}`, {
        method: "POST",
      });
      const data = await res.json();
      const newTpl = data.template || data.data?.template;
      if (res.ok && newTpl) {
        setTemplates((prev) => [newTpl, ...prev]);
      }
    } catch (err) {
      console.error("Failed to duplicate template:", err);
    } finally {
      setDuplicatingId(null);
    }
  };

  const confirmDelete = (tpl: TemplateItem) => {
    setTemplateToDelete(tpl);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;
    setDeletingId(templateToDelete._id);
    try {
      const res = await fetch(`/api/v1/admin/email/templates/${templateToDelete._id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t._id !== templateToDelete._id));
        setDeleteModalOpen(false);
        setTemplateToDelete(null);
      }
    } catch (err) {
      console.error("Failed to delete template:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
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
  }, [templates, activeTab, searchQuery]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16 font-sans">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/campaigns"
              className="text-muted-foreground hover:text-foreground text-xs flex items-center gap-1 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Campaigns
            </Link>
            <span className="text-muted-foreground">/</span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Layers className="w-6 h-6 text-primary" />
              Email Templates
            </h1>
          </div>
          <p className="mt-1 text-muted-foreground text-sm">
            Create, manage, and customize visual drag-and-drop studio blocks and clean personal outreach templates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/campaigns/templates/new?type=simple">
              <FileText className="mr-1.5 h-3.5 w-3.5 text-amber-600" />
              + New Simple Template
            </Link>
          </Button>

          <Button
            variant="primary"
            size="sm"
            asChild
            className="shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
          >
            <Link href="/admin/campaigns/templates/new?type=visual">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              + New Visual Template
            </Link>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search templates by title, subject, or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:border-primary outline-none transition"
          />
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-muted p-1 rounded-lg border border-border self-stretch sm:self-auto justify-center">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1 rounded text-xs font-medium transition ${
              activeTab === "all"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({templates.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("visual")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition ${
              activeTab === "visual"
                ? "bg-background text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            <span>Visual Studio ({templates.filter((t) => t.templateType !== "simple").length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("simple")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition ${
              activeTab === "simple"
                ? "bg-background text-amber-600 dark:text-amber-400 shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Simple / Text ({templates.filter((t) => t.templateType === "simple").length})</span>
          </button>
        </div>
      </div>

      {/* Templates Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Custom Templates ({filteredTemplates.length})
          </h2>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 bg-card rounded-xl border border-border text-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
            <span className="text-xs text-muted-foreground">Loading templates...</span>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-card rounded-xl border border-dashed border-border text-center space-y-3">
            <Layers className="w-8 h-8 text-muted-foreground opacity-50" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {searchQuery ? "No templates match your search." : "No saved templates yet"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Create a reusable Visual or Simple template to speed up your email campaign workflow.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/campaigns/templates/new?type=simple">
                  + Create Simple
                </Link>
              </Button>
              <Button variant="primary" size="sm" asChild className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <Link href="/admin/campaigns/templates/new?type=visual">
                  + Create Visual
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((tpl) => (
              <Card
                key={tpl._id}
                className="group flex flex-col justify-between hover:border-primary/50 transition duration-200 overflow-hidden"
              >
                <CardContent className="p-5 flex flex-col justify-between flex-1">
                  <div>
                    {/* Top Row */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${
                          tpl.templateType === "simple"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                            : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                        }`}
                      >
                        {tpl.templateType === "simple" ? "Simple / Text" : "Visual Studio"}
                      </span>

                      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition">
                        <button
                          type="button"
                          onClick={() => handleDuplicate(tpl)}
                          disabled={duplicatingId === tpl._id}
                          title="Duplicate Template"
                          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition"
                        >
                          {duplicatingId === tpl._id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <Link
                          href={`/admin/campaigns/templates/${tpl._id}/edit`}
                          title="Edit Template"
                          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary transition"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => confirmDelete(tpl)}
                          title="Delete Template"
                          className="p-1 hover:bg-red-50 dark:hover:bg-red-950 rounded text-muted-foreground hover:text-red-600 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition line-clamp-1">
                      {tpl.name}
                    </h3>

                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {tpl.subject || "No subject specified"}
                    </p>

                    {tpl.tags && tpl.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {tpl.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-4 border-t border-border flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      Updated {new Date(tpl.updatedAt).toLocaleDateString()}
                    </span>

                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" asChild className="h-7 text-xs px-2.5">
                        <Link href={`/admin/campaigns/templates/${tpl._id}/edit`}>
                          Edit
                        </Link>
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        asChild
                        className="h-7 text-xs px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                      >
                        <Link href={`/admin/campaigns/new?templateId=${tpl._id}`}>
                          Use <ArrowRight className="w-3 h-3 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Starter Presets Section */}
      <div className="pt-4 border-t border-border space-y-6">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            Designer Starter Templates
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Production-tested starter emails designed for instant conversions and maximum inbox deliverability.
          </p>
        </div>

        {/* Visual Starters */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Visual Studio Presets ({STARTER_TEMPLATES.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {STARTER_TEMPLATES.map((preset) => (
              <Card
                key={preset.id}
                className="group flex flex-col justify-between hover:border-indigo-500/50 transition duration-200"
              >
                <CardContent className="p-5 flex flex-col justify-between flex-1">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide bg-muted text-muted-foreground">
                        {preset.category}
                      </span>
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: preset.previewColor }}
                      />
                    </div>

                    <h4 className="text-sm font-bold text-foreground group-hover:text-indigo-600 transition line-clamp-1">
                      {preset.name}
                    </h4>

                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {preset.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-border flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      {preset.document.sections.length} blocks
                    </span>

                    <Button
                      variant="primary"
                      size="sm"
                      asChild
                      className="h-7 text-xs px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      <Link href={`/admin/campaigns/new?presetId=${preset.id}`}>
                        Use in Campaign →
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Simple Starters */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Simple & Personal Outreach Presets ({STARTER_SIMPLE_TEMPLATES.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {STARTER_SIMPLE_TEMPLATES.map((preset) => (
              <Card
                key={preset.id}
                className="group flex flex-col justify-between hover:border-amber-500/50 transition duration-200"
              >
                <CardContent className="p-5 flex flex-col justify-between flex-1">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        {preset.category}
                      </span>
                      <FileText className="w-3.5 h-3.5 text-amber-600" />
                    </div>

                    <h4 className="text-sm font-bold text-foreground group-hover:text-amber-600 transition line-clamp-1">
                      {preset.name}
                    </h4>

                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {preset.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-border flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Personal Text</span>

                    <Button
                      variant="secondary"
                      size="sm"
                      asChild
                      className="h-7 text-xs px-2.5 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950"
                    >
                      <Link href={`/admin/campaigns/new?simplePresetId=${preset.id}`}>
                        Use in Campaign →
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <ModalContent className="max-w-md p-6">
          <ModalHeader>
            <ModalTitle className="flex items-center gap-2 text-destructive text-base font-bold">
              <AlertTriangle className="w-4 h-4" />
              Delete Email Template
            </ModalTitle>
          </ModalHeader>
          <div className="mt-3 space-y-4">
            <p className="text-xs text-muted-foreground">
              Are you sure you want to delete <strong className="text-foreground">{templateToDelete?.name}</strong>? This action cannot be undone. Any existing campaigns that have already been dispatched will remain unchanged.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setDeleteModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={Boolean(deletingId)}
                onClick={handleDelete}
              >
                {deletingId ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Confirm Delete
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}
