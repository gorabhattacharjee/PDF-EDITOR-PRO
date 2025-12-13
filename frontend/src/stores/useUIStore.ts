import { create } from "zustand";

// Which ribbon tab is active
export type RibbonTab =
  | "home"
  | "comment"
  | "edit"
  | "convert"
  | "page"
  | "merge"
  | "protect"
  | "tools";

// Which tool is active (you can extend this as you wire more buttons)
export type ActiveTool =
  | "none"
  | "hand"
  | "select"
  | "highlight"
  | "underline"
  | "strikeout"
  | "pen"
  | "shapes"
  | "sticky-note"
  | "selectText"
  | "addText"
  | "editText"
  | "editImage"
  | "editAll";

// UI state shape
export interface UIState {
  // Ribbon
  activeTab: RibbonTab;
  setActiveTab: (tab: RibbonTab) => void;

  // Tools
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;

  // Page navigation
  activePage: number;
  setActivePage: (page: number) => void;

  // Zoom
  zoom: number;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;

  // File menu
  isFileMenuOpen: boolean;
  openFileMenu: () => void;
  closeFileMenu: () => void;
  toggleFileMenu: () => void;

  // Sanitize Modal
  isSanitizeModalOpen: boolean;
  openSanitizeModal: () => void;
  closeSanitizeModal: () => void;

  // Comments Panel
  isCommentsPanelOpen: boolean;
  toggleCommentsPanel: () => void;

  // Document Properties Modal
  isPropertiesModalOpen: boolean;
  openPropertiesModal: () => void;
  closePropertiesModal: () => void;

  // To Office Conversion Modal
  isToOfficeModalOpen: boolean;
  openToOfficeModal: () => void;
  closeToOfficeModal: () => void;

  // Highlight color
  highlightColor: string;
  setHighlightColor: (color: string) => void;

  // Drawing settings
  drawingColor: string;
  setDrawingColor: (color: string) => void;
  drawingStrokeWidth: number;
  setDrawingStrokeWidth: (width: number) => void;
  selectedShapeType: "rectangle" | "circle" | "line" | "arrow";
  setSelectedShapeType: (type: "rectangle" | "circle" | "line" | "arrow") => void;

  // Add Text Modal
  isAddTextModalOpen: boolean;
  openAddTextModal: () => void;
  closeAddTextModal: () => void;
  
  // Pending Add Text Position (captured when user clicks on PDF)
  pendingAddTextPosition: {
    page: number;
    x: number;
    y: number;
    zoom: number;
  } | null;
  setPendingAddTextPosition: (pos: { page: number; x: number; y: number; zoom: number } | null) => void;
  clearPendingAddText: () => void;
}

// MAIN STORE
export const useUIStore = create<UIState>((set) => ({
  // Default to Home tab
  activeTab: "home",
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Default tool = none
  activeTool: "none",
  setActiveTool: (tool) => set({ activeTool: tool }),

  // Default to first page
  activePage: 0,
  setActivePage: (page) =>
    set({
      activePage: page < 0 ? 0 : page,
    }),

  // Zoom (1.0 = 100%)
  zoom: 1,
  setZoom: (zoom) =>
    set({
      zoom: zoom <= 0.1 ? 0.1 : zoom,
    }),
  zoomIn: () =>
    set((state) => {
      const next = state.zoom + 0.1;
      return { zoom: next > 4 ? 4 : next }; // clamp max 400%
    }),
  zoomOut: () =>
    set((state) => {
      const next = state.zoom - 0.1;
      return { zoom: next < 0.1 ? 0.1 : next }; // clamp min 10%
    }),
  resetZoom: () => set({ zoom: 1 }),

  // File menu open/close
  isFileMenuOpen: false,
  openFileMenu: () => set({ isFileMenuOpen: true }),
  closeFileMenu: () => set({ isFileMenuOpen: false }),
  toggleFileMenu: () => set((state) => ({ isFileMenuOpen: !state.isFileMenuOpen })),

  // Sanitize Modal
  isSanitizeModalOpen: false,
  openSanitizeModal: () => set({ isSanitizeModalOpen: true }),
  closeSanitizeModal: () => set({ isSanitizeModalOpen: false }),

  // Comments Panel
  isCommentsPanelOpen: false,
  toggleCommentsPanel: () => set((state) => ({ isCommentsPanelOpen: !state.isCommentsPanelOpen })),

  // Document Properties Modal
  isPropertiesModalOpen: false,
  openPropertiesModal: () => set({ isPropertiesModalOpen: true }),
  closePropertiesModal: () => set({ isPropertiesModalOpen: false }),

  // To Office Conversion Modal
  isToOfficeModalOpen: false,
  openToOfficeModal: () => {
    console.log('[UIStore] openToOfficeModal called');
    set({ isToOfficeModalOpen: true });
    console.log('[UIStore] isToOfficeModalOpen set to true');
  },
  closeToOfficeModal: () => {
    console.log('[UIStore] closeToOfficeModal called');
    set({ isToOfficeModalOpen: false });
    console.log('[UIStore] isToOfficeModalOpen set to false');
  },

  // Highlight color (default yellow)
  highlightColor: '#FFFF00',
  setHighlightColor: (color) => set({ highlightColor: color }),

  // Drawing settings
  drawingColor: '#FF0000',
  setDrawingColor: (color) => set({ drawingColor: color }),
  drawingStrokeWidth: 3,
  setDrawingStrokeWidth: (width) => set({ drawingStrokeWidth: width }),
  selectedShapeType: 'rectangle',
  setSelectedShapeType: (type) => set({ selectedShapeType: type }),

  // Add Text Modal
  isAddTextModalOpen: false,
  openAddTextModal: () => {
    console.log('[UIStore] openAddTextModal called');
    set({ isAddTextModalOpen: true });
    console.log('[UIStore] isAddTextModalOpen set to true');
  },
  closeAddTextModal: () => {
    console.log('[UIStore] closeAddTextModal called');
    set({ isAddTextModalOpen: false });
  },
  
  // Pending Add Text Position (captured when user clicks on PDF)
  pendingAddTextPosition: null,
  setPendingAddTextPosition: (pos) => set({ pendingAddTextPosition: pos }),
  clearPendingAddText: () => set({ 
    pendingAddTextPosition: null, 
    isAddTextModalOpen: false,
    activeTool: 'none'
  }),
}));

// Support both:
//   import { useUIStore } from "@/stores/useUIStore";
// and
//   import useUIStore from "@/stores/useUIStore";
export default useUIStore;