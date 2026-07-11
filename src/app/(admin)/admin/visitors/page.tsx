"use client";

import { useCallback, useEffect, useRef, useState, Fragment } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { Badge } from "@/components/ds/badge";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { Skeleton } from "@/components/ds/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ds/table";
import { cn } from "@/components/ds/utils";
import { connectVisitorSse } from "@/lib/visitors/sse-client";
import type { VisitorStreamRecord } from "@/lib/visitors/stream-types";
import { ChevronLeft, ChevronRight, Radio, Trash2 } from "lucide-react";

const POLL_MS = 5000;
const NEW_HIGHLIGHT_MS = 5000;
const SSE_RECONNECT_MS = 3000;

interface VisitorGeo {
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  zip?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  proxy?: boolean;
  mobile?: boolean;
  hosting?: boolean;
}

interface VisitorLog extends VisitorStreamRecord {}

function formatLocation(geo?: VisitorGeo): string {
  if (!geo) return "Unknown";
  const parts = [geo.city, geo.region, geo.country ?? geo.countryCode].filter(Boolean);
  return parts.join(", ") || "Unknown";
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function formatRelativeTime(value: string): string {
  const diff = Date.now() - new Date(value).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return formatDate(value);
}

export default function AdminVisitorsPage() {
  const { accessToken } = useAuthStore();
  const [visitors, setVisitors] = useState<VisitorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newVisitorIds, setNewVisitorIds] = useState<Set<string>>(new Set());
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [isLive, setIsLive] = useState(true);
  const [streamMode, setStreamMode] = useState<"sse" | "poll">("sse");
  const [sseKey, setSseKey] = useState(0);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const hasLoadedOnceRef = useRef(false);
  const reconnectTimerRef = useRef<number | null>(null);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!accessToken) return;
      const silent = options?.silent ?? false;

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const params = new URLSearchParams({ page: String(page), limit: "25" });
        if (query) params.set("q", query);

        const res = await fetch(`/api/v1/admin/visitors?${params}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        });
        const d = await res.json();
        const nextVisitors: VisitorLog[] = d.data?.visitors ?? [];

        if (hasLoadedOnceRef.current && page === 1 && !query) {
          const freshIds = nextVisitors
            .map((v) => v._id)
            .filter((id) => !knownIdsRef.current.has(id));
          if (freshIds.length > 0) {
            setNewVisitorIds(new Set(freshIds));
            window.setTimeout(() => setNewVisitorIds(new Set()), NEW_HIGHLIGHT_MS);
          }
        }

        knownIdsRef.current = new Set(nextVisitors.map((v) => v._id));
        hasLoadedOnceRef.current = true;

        setVisitors(nextVisitors);
        setPages(d.data?.pagination?.pages ?? 1);
        setTotal(d.data?.pagination?.total ?? 0);
        setLastUpdatedAt(new Date());
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, page, query]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    knownIdsRef.current = new Set();
  }, [page, query]);

  const markNewVisitor = useCallback((id: string) => {
    setNewVisitorIds((prev) => new Set(prev).add(id));
    window.setTimeout(() => {
      setNewVisitorIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, NEW_HIGHLIGHT_MS);
  }, []);

  const handleStreamVisitor = useCallback(
    (visitor: VisitorLog) => {
      setLastUpdatedAt(new Date());

      if (page !== 1 || query) {
        setTotal((t) => t + 1);
        return;
      }

      if (knownIdsRef.current.has(visitor._id)) return;

      knownIdsRef.current.add(visitor._id);
      setVisitors((prev) => {
        const without = prev.filter((v) => v._id !== visitor._id);
        return [visitor, ...without].slice(0, 25);
      });
      setTotal((t) => t + 1);
      markNewVisitor(visitor._id);
    },
    [page, query, markNewVisitor]
  );

  const handleStreamDeleted = useCallback((id: string) => {
    setLastUpdatedAt(new Date());
    knownIdsRef.current.delete(id);
    setVisitors((prev) => {
      const had = prev.some((v) => v._id === id);
      if (had) setTotal((t) => Math.max(0, t - 1));
      return prev.filter((v) => v._id !== id);
    });
    setExpandedId((current) => (current === id ? null : current));
  }, []);

  useEffect(() => {
    if (!accessToken || !isLive || streamMode !== "sse") return;

    let connection: ReturnType<typeof connectVisitorSse> | null = null;

    const connect = () => {
      if (document.visibilityState !== "visible") return;

      connection?.close();
      connection = connectVisitorSse(
        accessToken,
        (event) => {
          if (event.type === "connected") {
            setStreamMode("sse");
            return;
          }
          if (event.type === "visitor") {
            handleStreamVisitor(event.visitor);
            return;
          }
          if (event.type === "deleted") {
            handleStreamDeleted(event.id);
            return;
          }
          if (event.type === "error") {
            setStreamMode("poll");
          }
        },
        () => {
          if (!isLive || streamMode !== "sse") return;
          reconnectTimerRef.current = window.setTimeout(() => {
            setSseKey((k) => k + 1);
          }, SSE_RECONNECT_MS);
        }
      );
    };

    connect();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        connect();
      } else {
        connection?.close();
      }
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      connection?.close();
      document.removeEventListener("visibilitychange", onVisible);
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [
    accessToken,
    isLive,
    streamMode,
    sseKey,
    handleStreamVisitor,
    handleStreamDeleted,
  ]);

  useEffect(() => {
    if (!accessToken || !isLive || streamMode !== "poll") return;

    const poll = () => {
      if (document.visibilityState === "visible") {
        load({ silent: true });
      }
    };

    const interval = window.setInterval(poll, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        load({ silent: true });
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [accessToken, isLive, streamMode, load]);

  const handleDelete = async (visitor: VisitorLog) => {
    if (
      !confirm(
        `Delete visit from ${visitor.ip ?? "unknown IP"} on ${formatDate(visitor.visitedAt)}?`
      )
    ) {
      return;
    }

    setDeletingId(visitor._id);
    try {
      const res = await fetch(`/api/v1/admin/visitors/${visitor._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        if (expandedId === visitor._id) setExpandedId(null);
        knownIdsRef.current.delete(visitor._id);
        load({ silent: true });
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-display-h2 text-foreground">Visitors</h1>
            <button
              type="button"
              onClick={() =>
                setIsLive((v) => {
                  const next = !v;
                  if (next) setStreamMode("sse");
                  return next;
                })
              }
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
                isLive
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-border bg-secondary text-muted-foreground"
              )}
            >
              <Radio
                className={cn("h-3.5 w-3.5", isLive && "animate-pulse text-emerald-500")}
              />
              {isLive ? "Live" : "Paused"}
            </button>
            {isLive && (
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {streamMode === "sse" ? "SSE" : "Polling"}
              </span>
            )}
            {refreshing && (
              <span className="text-[12px] text-muted-foreground">Updating…</span>
            )}
          </div>
          <p className="mt-1 text-body text-muted-foreground">
            New visitors appear instantly via server push. Falls back to polling if the live stream is unavailable.
          </p>
          {lastUpdatedAt && (
            <p className="mt-1 text-[12px] text-muted-foreground">
              Last updated {formatRelativeTime(lastUpdatedAt.toISOString())}
            </p>
          )}
        </div>
        <p className="text-small font-medium text-foreground">{total} total visits</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <Input
          placeholder="Search IP, city, country, page, browser..."
          className="max-w-md"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : visitors.length === 0 ? (
        <p className="text-body text-muted-foreground">No visitor logs yet.</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Landing page</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Telegram</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visitors.map((visitor) => {
                const expanded = expandedId === visitor._id;
                const isNew = newVisitorIds.has(visitor._id);
                return (
                  <Fragment key={visitor._id}>
                    <TableRow
                      className={cn(
                        "cursor-pointer transition-colors",
                        isNew && "bg-emerald-500/10 animate-pulse"
                      )}
                      onClick={() =>
                        setExpandedId(expanded ? null : visitor._id)
                      }
                    >
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {isNew && (
                            <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                              New
                            </span>
                          )}
                          <span className="text-muted-foreground">
                            {formatDate(visitor.visitedAt)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{visitor.ip ?? "—"}</TableCell>
                      <TableCell>{formatLocation(visitor.geo)}</TableCell>
                      <TableCell className="max-w-[220px] truncate">
                        {visitor.landingPath ?? "—"}
                      </TableCell>
                      <TableCell>
                        {[visitor.device, visitor.browser, visitor.os]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={visitor.telegramSent ? "default" : "secondary"}>
                          {visitor.telegramSent ? "Sent" : "Not sent"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Delete visit"
                          disabled={deletingId === visitor._id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(visitor);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expanded && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-secondary/40">
                          <div className="grid gap-4 py-2 text-small md:grid-cols-2 lg:grid-cols-3">
                            <DetailItem label="Referrer" value={visitor.referrer || "Direct / none"} />
                            <DetailItem label="Language" value={visitor.language} />
                            <DetailItem label="Accept-Language" value={visitor.acceptLanguage} />
                            <DetailItem label="Screen" value={visitor.screen} />
                            <DetailItem label="Viewport" value={visitor.viewport} />
                            <DetailItem label="Timezone" value={visitor.timezone ?? visitor.geo?.timezone} />
                            <DetailItem label="ZIP" value={visitor.geo?.zip} />
                            <DetailItem
                              label="Coordinates"
                              value={
                                visitor.geo?.lat != null && visitor.geo?.lon != null
                                  ? `${visitor.geo.lat}, ${visitor.geo.lon}`
                                  : undefined
                              }
                            />
                            <DetailItem label="ISP" value={visitor.geo?.isp} />
                            <DetailItem label="Organization" value={visitor.geo?.org} />
                            <DetailItem label="Proxy/VPN" value={visitor.geo?.proxy ? "Yes" : "No"} />
                            <DetailItem label="Mobile network" value={visitor.geo?.mobile ? "Yes" : "No"} />
                            <DetailItem label="Hosting/DC" value={visitor.geo?.hosting ? "Yes" : "No"} />
                            <DetailItem label="Platform" value={visitor.platform} className="md:col-span-2 lg:col-span-3" />
                            <DetailItem label="User-Agent" value={visitor.userAgent} className="md:col-span-2 lg:col-span-3" />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>

          {pages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-small text-muted-foreground">
                Page {page} of {pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DetailItem({
  label,
  value,
  className,
}: {
  label: string;
  value?: string | null;
  className?: string;
}) {
  if (!value) return null;
  return (
    <div className={className}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-all text-foreground">{value}</p>
    </div>
  );
}
