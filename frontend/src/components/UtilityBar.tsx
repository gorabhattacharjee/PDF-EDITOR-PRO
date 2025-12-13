'use client';

import { useDocumentsStore } from '@/stores/useDocumentsStore';
import { useUIStore } from '@/stores/useUIStore';
import toast from 'react-hot-toast';

export default function UtilityBar() {
  const { documents, activeDocId, updateDocument } = useDocumentsStore();
  const { zoom, setZoom } = useUIStore();
  const activeDoc = documents.find((d) => d.id === activeDocId);

  const handlePrevPage = () => {
    if (!activeDoc || activeDoc.currentPage <= 1) return;
    updateDocument(activeDoc.id, { currentPage: activeDoc.currentPage - 1 });
  };

  const handleNextPage = () => {
    if (!activeDoc || activeDoc.currentPage >= activeDoc.numPages) return;
    updateDocument(activeDoc.id, { currentPage: activeDoc.currentPage + 1 });
  };

  const handleZoomIn = () => {
    setZoom(Math.min(zoom + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(zoom - 0.25, 0.5));
  };

  const handleFitWidth = () => {
    setZoom(1.5);
  };

  const handlePrint = () => {
    if (!activeDoc) return;
    window.print();
    toast.success('Opening print dialog...');
  };

  return (
    <div className="flex items-center justify-center gap-3 px-4 py-2 bg-white border-b">
      <button
        onClick={handlePrevPage}
        disabled={!activeDoc || activeDoc.currentPage <= 1}
        className="btn btn-sm"
        title="Previous Page"
      >
        ◀
      </button>
      <div className="text-sm">
        {activeDoc ? (
          <>
            Page {activeDoc.currentPage} / {activeDoc.numPages}
          </>
        ) : (
          'No document'
        )}
      </div>
      <button
        onClick={handleNextPage}
        disabled={!activeDoc || activeDoc.currentPage >= activeDoc.numPages}
        className="btn btn-sm"
        title="Next Page"
      >
        ▶
      </button>

      <div className="border-l h-6 mx-2"></div>

      <button onClick={handleZoomOut} className="btn btn-sm" title="Zoom Out" disabled={!activeDoc}>
        ➖
      </button>
      <div className="text-sm w-16 text-center">{Math.round(zoom * 100)}%</div>
      <button onClick={handleZoomIn} className="btn btn-sm" title="Zoom In" disabled={!activeDoc}>
        ➕
      </button>
      <button onClick={handleFitWidth} className="btn btn-sm" title="Fit to Width" disabled={!activeDoc}>
        ⬌ Fit
      </button>

      <div className="border-l h-6 mx-2"></div>

      <button onClick={handlePrint} className="btn btn-sm" title="Print" disabled={!activeDoc}>
        🖨️ Print
      </button>
    </div>
  );
}
