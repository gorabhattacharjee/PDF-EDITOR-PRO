import { create } from 'zustand';

type Tool =
  | 'hand'
  | 'select'
  | 'addText'
  | 'highlight'
  | 'underline'
  | 'strikeout'
  | 'stickyNote'
  | 'pen'
  | 'shapes';

interface UIStore {
  sidebarOpen: boolean;
  propertiesOpen: boolean;
  tool: Tool;
  zoom: number;
  viewMode: 'single' | 'continuous';
  setSidebarOpen: (open: boolean) => void;
  setPropertiesOpen: (open: boolean) => void;
  setTool: (tool: Tool) => void;
  setZoom: (zoom: number) => void;
  setViewMode: (mode: 'single' | 'continuous') => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  propertiesOpen: false,
  tool: 'select',
  zoom: 1.5,
  viewMode: 'single',

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setPropertiesOpen: (open) => set({ propertiesOpen: open }),
  setTool: (tool) => set({ tool }),
  setZoom: (zoom) => set({ zoom }),
  setViewMode: (mode) => set({ viewMode: mode }),
}));
