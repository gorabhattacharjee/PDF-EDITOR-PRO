import { create } from 'zustand';

interface UIState {
  zoom: number;
  activeTool: string | null;
  sidebarVisible: boolean;
  propertiesPanelVisible: boolean;
  setZoom: (zoom: number) => void;
  setActiveTool: (tool: string | null) => void;
  toggleSidebar: () => void;
  togglePropertiesPanel: () => void;
}

export const useUI = create<UIState>((set) => ({
  zoom: 1.5,
  activeTool: null,
  sidebarVisible: true,
  propertiesPanelVisible: true,

  setZoom: (zoom: number) => set({ zoom }),
  setActiveTool: (tool: string | null) => set({ activeTool: tool }),
  toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),
  togglePropertiesPanel: () =>
    set((state) => ({ propertiesPanelVisible: !state.propertiesPanelVisible })),
}));
