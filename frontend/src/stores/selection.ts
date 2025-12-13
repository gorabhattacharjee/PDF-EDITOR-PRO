import { create } from 'zustand';

interface SelectedObject {
  type: 'text' | 'image' | 'shape' | 'annotation' | null;
  id: string;
  properties: Record<string, any>;
}

interface SelectionState {
  selectedObject: SelectedObject | null;
  setSelectedObject: (obj: SelectedObject | null) => void;
  clearSelection: () => void;
}

export const useSelection = create<SelectionState>((set) => ({
  selectedObject: null,
  
  setSelectedObject: (obj: SelectedObject | null) => set({ selectedObject: obj }),
  
  clearSelection: () => set({ selectedObject: null }),
}));
