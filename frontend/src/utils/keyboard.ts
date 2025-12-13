import useDocumentsStore from '@/stores/useDocumentsStore';
import { useUIStore } from '@/stores/useUIStore';
import toast from 'react-hot-toast';

export function setupKeyboardShortcuts() {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ctrl/Cmd + O - Open file
    if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
      e.preventDefault();
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf';
      input.onchange = (event: any) => {
        const file = event.target.files?.[0];
        if (file) {
          useDocumentsStore.getState().openDocument(file);
          toast.success(`Opened ${file.name}`);
        }
      };
      input.click();
    }

    // Ctrl/Cmd + S - Save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      toast.success('Saving document...');
    }

    // Ctrl/Cmd + P - Print
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      window.print();
    }

    // Ctrl/Cmd + Plus - Zoom in
    if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
      e.preventDefault();
      const { zoom, zoomIn } = useUIStore.getState();
      zoomIn();
    }

    // Ctrl/Cmd + Minus - Zoom out
    if ((e.ctrlKey || e.metaKey) && e.key === '-') {
      e.preventDefault();
      const { zoom, zoomOut } = useUIStore.getState();
      zoomOut();
    }

    // Ctrl/Cmd + 0 - Reset zoom
    if ((e.ctrlKey || e.metaKey) && e.key === '0') {
      e.preventDefault();
      useUIStore.getState().resetZoom();
      toast('Zoom reset to 100%');
    }
  };

  document.addEventListener('keydown', handleKeyDown);

  return () => {
    document.removeEventListener('keydown', handleKeyDown);
  };
}
