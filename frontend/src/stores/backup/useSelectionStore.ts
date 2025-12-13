import { create } from 'zustand';

type SelectionType = 'none' | 'text' | 'image' | 'annotation' | 'page';

interface SelectionStore {
  type: SelectionType;
  data: any;
  setSelection: (type: SelectionType, data: any) => void;
  clearSelection: () => void;
}

export const useSelectionStore = create<SelectionStore>((set) => ({
  type: 'none',
  data: null,

  setSelection: (type, data) => set({ type, data }),
  clearSelection: () => set({ type: 'none', data: null }),
}));
