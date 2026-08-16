export const LEAD_TARGET_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "country",
  "brand",
  "address",
  "status",
  "agent",
  "notes",
  "tags",
  "source",
] as const;

export type LeadTargetField = (typeof LEAD_TARGET_FIELDS)[number];
