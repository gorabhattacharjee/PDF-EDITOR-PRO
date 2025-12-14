'use client';

import { useState, useRef } from 'react';
import { useDocumentsStore } from '@/stores/useDocumentsStore';
import { useUIStore } from '@/stores/useUIStore';
import toast from 'react-hot-toast';

export default function UtilityBar() {
  const { documents, activeDocId, updateDocument } = useDocumentsStore();
  const { zoom, setZoom } = useUIStore();
  const activeDoc = documents.find((d) => d.id === activeDocId);
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const handleSearch = () => {
    if (!activeDoc) {
      toast.error('Please open a PDF first');
      return;
    }
    setShowSearch(!showSearch);
    if (!showSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  };

  const performSearch = () => {
    if (!searchText.trim()) {
      toast.error('Please enter search text');
      return;
    }
    
    const canvasPanel = document.querySelector('.canvas-panel');
    if (!canvasPanel) {
      toast.error('PDF view not found');
      return;
    }

    const textLayers = canvasPanel.querySelectorAll('.textLayer span, [data-text-content]');
    let found = false;
    let foundCount = 0;

    textLayers.forEach((el) => {
      const htmlEl = el as HTMLElement;
      const text = htmlEl.textContent || '';
      if (text.toLowerCase().includes(searchText.toLowerCase())) {
        htmlEl.style.backgroundColor = 'yellow';
        htmlEl.style.color = 'black';
        if (!found) {
          htmlEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          found = true;
        }
        foundCount++;
      } else {
        htmlEl.style.backgroundColor = '';
        htmlEl.style.color = '';
      }
    });

    if (foundCount > 0) {
      toast.success(`Found ${foundCount} matches for "${searchText}"`);
    } else {
      toast(`No matches found for "${searchText}"`, { icon: '🔍' });
    }
  };

  const clearSearch = () => {
    setSearchText('');
    const canvasPanel = document.querySelector('.canvas-panel');
    if (canvasPanel) {
      const textLayers = canvasPanel.querySelectorAll('.textLayer span, [data-text-content]');
      textLayers.forEach((el) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.backgroundColor = '';
        htmlEl.style.color = '';
      });
    }
    toast.success('Search cleared');
  };

  const handleBookmarks = () => {
    if (!activeDoc) {
      toast.error('Please open a PDF first');
      return;
    }
    
    toast('PDF Bookmarks/Outline viewer coming soon!', { icon: '📑' });
    
    const pageList = [];
    for (let i = 1; i <= activeDoc.numPages; i++) {
      pageList.push(`Page ${i}`);
    }
    
    const goToPage = prompt(
      `PDF has ${activeDoc.numPages} pages.\n\nEnter page number to jump to (1-${activeDoc.numPages}):`
    );
    
    if (goToPage) {
      const pageNum = parseInt(goToPage);
      if (pageNum >= 1 && pageNum <= activeDoc.numPages) {
        updateDocument(activeDoc.id, { currentPage: pageNum });
        toast.success(`Jumped to page ${pageNum}`);
      } else {
        toast.error('Invalid page number');
      }
    }
  };

  return (
    <div className="flex items-center justify-center gap-3 px-4 py-2 bg-white border-b flex-wrap">
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

      <button onClick={handleSearch} className="btn btn-sm" title="Search" disabled={!activeDoc}>
        🔍 Search
      </button>
      <button onClick={handleBookmarks} className="btn btn-sm" title="Bookmarks / Go to Page" disabled={!activeDoc}>
        📑 Pages
      </button>
      <button onClick={handlePrint} className="btn btn-sm" title="Print" disabled={!activeDoc}>
        🖨️ Print
      </button>

      {showSearch && (
        <div className="flex items-center gap-2 ml-2 bg-gray-100 px-3 py-1 rounded">
          <input
            ref={searchInputRef}
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && performSearch()}
            placeholder="Search text..."
            className="px-2 py-1 border rounded text-sm w-40"
          />
          <button onClick={performSearch} className="btn btn-sm bg-blue-500 text-white px-2 py-1 rounded text-sm">
            Find
          </button>
          <button onClick={clearSearch} className="btn btn-sm bg-gray-300 px-2 py-1 rounded text-sm">
            Clear
          </button>
          <button onClick={() => setShowSearch(false)} className="btn btn-sm text-gray-500 text-sm">
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
