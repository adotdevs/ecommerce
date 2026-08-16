export interface ImportProgress {
  phase: "mapping" | "checking" | "inserting" | "done";
  processed: number;
  total: number;
  left: number;
  inserted: number;
  skippedDuplicates: number;
  skippedFiltered: number;
  skippedInvalid: number;
  percent: number;
}
