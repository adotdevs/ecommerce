import type { BlockType, EmailDocument, EmailSection, GlobalStyles, SectionSettings } from "@/lib/email/document-schema";

export type DeviceMode = "desktop" | "mobile";

export type CanvasZoom = "100" | "90" | "80" | "75" | "fit";

export type BuilderActiveTab = "blocks" | "settings" | "styles" | "templates";

export interface BuilderState {
  document: EmailDocument;
  selectedSectionId: string | null;
  deviceMode: DeviceMode;
  activeTab: BuilderActiveTab;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;
}

export interface DragItem {
  id: string;
  type: BlockType;
  index: number;
}
