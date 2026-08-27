import { NextRequest } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import {
  detectSourceFields,
  guessFieldMapping,
  parseLeadFile,
} from "@/lib/leads/parse";
import {
  importLeads,
  previewMappedLeads,
  type FieldMapping,
  type ImportFilters,
  type ImportProgress,
  type ImportResult,
} from "@/lib/leads/import";
import { LEAD_TARGET_FIELDS } from "@/lib/leads/fields";
import { MAX_LEADS_UPLOAD_BYTES, formatBytes } from "@/lib/leads/limits";

const filtersSchema = z.object({
  country: z.string().optional(),
  phonePrefix: z.string().optional(),
  phoneCountry: z.string().optional(),
  phoneLength: z.number().int().min(6).max(20).optional(),
  requireValidPhoneLength: z.boolean().optional(),
  status: z.string().optional(),
  brand: z.string().optional(),
  requireEmail: z.boolean().optional(),
  requirePhone: z.boolean().optional(),
});

const mappingValue = z.union([
  z.enum(LEAD_TARGET_FIELDS),
  z.literal(""),
  z.null(),
]);

function sseResponse(
  run: (send: (event: string, data: unknown) => void) => Promise<void>
) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      void (async () => {
        try {
          await run(send);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Import failed";
          send("error", { message });
        } finally {
          controller.close();
        }
      })();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      return handleMultipart(request);
    }

    const body = await request.json();
    const mode = body?.mode as string | undefined;

    if (mode === "analyze") {
      const text = z.string().min(1).parse(body.text);
      if (new TextEncoder().encode(text).length > MAX_LEADS_UPLOAD_BYTES) {
        return apiError(`File too large (max ${formatBytes(MAX_LEADS_UPLOAD_BYTES)})`);
      }
      const filename = z.string().default("leads.json").parse(body.filename);
      const rows = parseLeadFile(text, filename);
      const sourceFields = detectSourceFields(rows);
      return apiSuccess({
        rowCount: rows.length,
        sourceFields,
        suggestedMapping: guessFieldMapping(sourceFields),
        sample: rows.slice(0, 5),
        targetFields: LEAD_TARGET_FIELDS,
      });
    }

    if (mode === "preview") {
      const text = z.string().min(1).parse(body.text);
      const filename = z.string().default("leads.json").parse(body.filename);
      const mapping = z.record(z.string(), mappingValue).parse(body.mapping) as FieldMapping;
      const filters = filtersSchema.parse(body.filters ?? {}) as ImportFilters;
      const rows = parseLeadFile(text, filename);
      return apiSuccess(previewMappedLeads(rows, mapping, filters));
    }

    if (mode === "import-chunk") {
      const rows = z
        .array(z.record(z.string(), z.unknown()))
        .max(5000)
        .parse(body.rows);
      const mapping = z.record(z.string(), mappingValue).parse(body.mapping) as FieldMapping;
      const filters = filtersSchema.parse(body.filters ?? {}) as ImportFilters;
      const source = z.string().optional().parse(body.source);
      const importBatchId = z.string().min(4).parse(body.importBatchId);
      const result = await importLeads(rows, mapping, filters, {
        source: source || "chunk-import",
        importBatchId,
      });
      return apiSuccess({
        ...result,
        chunkIndex: body.chunkIndex ?? 0,
        chunkTotal: body.chunkTotal ?? 1,
      });
    }

    if (mode === "import") {
      const text = z.string().min(1).parse(body.text);
      if (new TextEncoder().encode(text).length > MAX_LEADS_UPLOAD_BYTES) {
        return apiError(`File too large (max ${formatBytes(MAX_LEADS_UPLOAD_BYTES)})`);
      }
      const filename = z.string().default("leads.json").parse(body.filename);
      const mapping = z.record(z.string(), mappingValue).parse(body.mapping) as FieldMapping;
      const filters = filtersSchema.parse(body.filters ?? {}) as ImportFilters;
      const source = z.string().optional().parse(body.source);
      const stream = Boolean(body.stream);
      const rows = parseLeadFile(text, filename);

      if (stream) {
        return sseResponse(async (send) => {
          send("start", { totalRows: rows.length });
          const result = await importLeads(rows, mapping, filters, {
            source: source || filename,
            onProgress: (progress: ImportProgress) => send("progress", progress),
          });
          send("done", result);
        });
      }

      const result = await importLeads(rows, mapping, filters, {
        source: source || filename,
      });
      return apiSuccess(result);
    }

    return apiError("Invalid mode. Use analyze | preview | import | import-chunk");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed";
    const status = message.includes("MONGODB_LEADS_URI") ? 503 : 400;
    return apiError(message, status);
  }
}, PERMISSIONS.MARKETING_WRITE);

async function handleMultipart(request: NextRequest) {
  const form = await request.formData();
  const file = form.get("file");
  const mode = String(form.get("mode") || "analyze");
  const mappingRaw = form.get("mapping");
  const filtersRaw = form.get("filters");
  const source = form.get("source");
  const stream = String(form.get("stream") || "") === "1";

  if (!(file instanceof File)) return apiError("file is required");
  if (file.size > MAX_LEADS_UPLOAD_BYTES) {
    return apiError(`File too large (max ${formatBytes(MAX_LEADS_UPLOAD_BYTES)})`);
  }

  const text = await file.text();
  const filename = file.name || "leads.json";
  const rows = parseLeadFile(text, filename);

  if (mode === "analyze") {
    const sourceFields = detectSourceFields(rows);
    return apiSuccess({
      rowCount: rows.length,
      sourceFields,
      suggestedMapping: guessFieldMapping(sourceFields),
      sample: rows.slice(0, 5),
      targetFields: LEAD_TARGET_FIELDS,
      filename,
    });
  }

  const mapping = z
    .record(z.string(), mappingValue)
    .parse(typeof mappingRaw === "string" ? JSON.parse(mappingRaw) : {}) as FieldMapping;
  const filters = filtersSchema.parse(
    typeof filtersRaw === "string" && filtersRaw ? JSON.parse(filtersRaw) : {}
  ) as ImportFilters;

  if (mode === "preview") {
    return apiSuccess(previewMappedLeads(rows, mapping, filters));
  }

  if (mode === "import") {
    const importSource =
      typeof source === "string" && source ? source : filename;

    if (stream) {
      return sseResponse(async (send) => {
        send("start", { totalRows: rows.length, filename });
        const result: ImportResult = await importLeads(rows, mapping, filters, {
          source: importSource,
          onProgress: (progress: ImportProgress) => send("progress", progress),
        });
        send("done", result);
      });
    }

    const result = await importLeads(rows, mapping, filters, {
      source: importSource,
    });
    return apiSuccess(result);
  }

  return apiError("Invalid mode. Use analyze | preview | import");
}
