"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ds/button";
import { Badge } from "@/components/ds/badge";

interface CmsPage {
  _id: string;
  title: string;
  slug: string;
  status: string;
}

export default function AdminCmsPage() {
  const { accessToken } = useAuthStore();
  const [pages, setPages] = useState<CmsPage[]>([]);

  useEffect(() => {
    fetch("/api/v1/admin/cms/pages", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => setPages(d.data ?? []));
  }, [accessToken]);

  return (
    <div>
      <h1 className="mb-8 text-3xl font-bold">CMS Pages</h1>
      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Slug</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => (
              <tr key={page._id} className="border-b">
                <td className="px-4 py-3 font-medium">{page.title}</td>
                <td className="px-4 py-3 text-muted-foreground">/pages/{page.slug}</td>
                <td className="px-4 py-3">
                  <Badge variant={page.status === "published" ? "default" : "secondary"}>
                    {page.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/pages/${page.slug}`} target="_blank">View</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
