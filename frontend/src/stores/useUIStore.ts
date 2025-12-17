import { create } from "zustand";

export type Tool =
  | "hand"
  | "select"
  | "highlight"
  | "underline"
  | "strikeout"
  | "comment"
  | "draw"
  | "shape"
  | "editText"
  | "editImage"
  | "editAll"
  | "addText"
  | "ocr"
  | "pen"
  | "shapes"
  | "sticky-note"
  | "none";

export type PendingAddTextPosition = {
  page: number;
  x: number;
  y: number;
  zoom: number;
};

export type AddTextConfig = {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontColor: string; // hex like "#000000"
};

export interface UIState {
  // Active tool
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;

  // Page navigation
  activePage: number;
  setActivePage: (page: number) => void;

  // Zoom level
  zoom: number;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;

  // Highlight settings
  highlightColor: string;
  setHighlightColor: (color: string) => void;

  // Drawing settings
  drawingColor: string;
  setDrawingColor: (color: string) => void;
  drawingStrokeWidth: number;
  setDrawingStrokeWidth: (width: number) => void;

  // Shape settings
  selectedShapeType: string;
  setSelectedShapeType: (type: string) => void;

  // Comments panel
  isCommentsPanelOpen: boolean;
  toggleCommentsPanel: () => void;

  // Add Text modal state
  isAddTextModalOpen: boolean;
  openAddTextModal: () => void;
  closeAddTextModal: () => void;

  // Pending "Add Text" position (click point on canvas)
  pendingAddTextPosition: PendingAddTextPosition | null;
  setPendingAddTextPosition: (pos: PendingAddTextPosition | null) => void;
  clearPendingAddText: () => void;

  // Pending "Add Text" config (what user typed / chose)
  pendingAddTextConfig: AddTextConfig | null;
  setPendingAddTextConfig: (cfg: AddTextConfig | null) => void;
  clearPendingAddTextConfig: () => void;

  // Image Export Modal
  isImageExportModalOpen: boolean;
  openImageExportModal: () => void;
  closeImageExportModal: () => void;

  // Office Conversion Modal
  isToOfficeModalOpen: boolean;
  openToOfficeModal: () => void;
  closeToOfficeModal: () => void;

  // Document Properties Modal
  isPropertiesModalOpen: boolean;
  openPropertiesModal: () => void;
  closePropertiesModal: () => void;

  // Sanitize Modal
  isSanitizeModalOpen: boolean;
  openSanitizeModal: () => void;
  closeSanitizeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Active tool
  activeTool: "none",
  setActiveTool: (tool) => set({ activeTool: tool }),

  // Page navigation
  activePage: 0,
  setActivePage: (page) => set({ activePage: page }),

  // Zoom level
  zoom: 1,
  setZoom: (zoom) => set({ zoom }),
  zoomIn: () => set((state) => ({ zoom: Math.min(state.zoom + 0.2, 3) })),
  zoomOut: () => set((state) => ({ zoom: Math.max(state.zoom - 0.2, 0.5) })),
  resetZoom: () => set({ zoom: 1 }),

  // Highlight settings
  highlightColor: "#FFFF00",
  setHighlightColor: (color) => set({ highlightColor: color }),

  // Drawing settings
  drawingColor: "#000000",
  setDrawingColor: (color) => set({ drawingColor: color }),
  drawingStrokeWidth: 2,
  setDrawingStrokeWidth: (width) => set({ drawingStrokeWidth: width }),

  // Shape settings
  selectedShapeType: "rectangle",
  setSelectedShapeType: (type) => set({ selectedShapeType: type }),

  // Comments panel
  isCommentsPanelOpen: false,
  toggleCommentsPanel: () => set((state) => ({ isCommentsPanelOpen: !state.isCommentsPanelOpen })),

  // Add Text modal state
  isAddTextModalOpen: false,
  openAddTextModal: () => set({ isAddTextModalOpen: true }),
  closeAddTextModal: () => set({ isAddTextModalOpen: false }),

  // Pending "Add Text" position (click point on canvas)
  pendingAddTextPosition: null,
  setPendingAddTextPosition: (pos) => set({ pendingAddTextPosition: pos }),
  clearPendingAddText: () => set({ pendingAddTextPosition: null, isAddTextModalOpen: false }),

  // Pending "Add Text" config (what user typed / chose)
  pendingAddTextConfig: null,
  setPendingAddTextConfig: (cfg) => set({ pendingAddTextConfig: cfg }),
  clearPendingAddTextConfig: () => set({ pendingAddTextConfig: null }),

  // Image Export Modal
  isImageExportModalOpen: false,
  openImageExportModal: () => set({ isImageExportModalOpen: true }),
  closeImageExportModal: () => set({ isImageExportModalOpen: false }),

  // Office Conversion Modal
  isToOfficeModalOpen: false,
  openToOfficeModal: () => set({ isToOfficeModalOpen: true }),
  closeToOfficeModal: () => set({ isToOfficeModalOpen: false }),

  // Document Properties Modal
  isPropertiesModalOpen: false,
  openPropertiesModal: () => set({ isPropertiesModalOpen: true }),
  closePropertiesModal: () => set({ isPropertiesModalOpen: false }),

  // Sanitize Modal
  isSanitizeModalOpen: false,
  openSanitizeModal: () => set({ isSanitizeModalOpen: true }),
  closeSanitizeModal: () => set({ isSanitizeModalOpen: false }),
}));

export default useUIStore;
