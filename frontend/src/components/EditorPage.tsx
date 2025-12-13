'use client';

import RibbonBar from './RibbonBar';
import Canvas from './Canvas';
import Sidebar from './Sidebar';
import { useDocumentsStore } from '@/stores/useDocumentsStore';
import CommentsPanel from './CommentsPanel';

export default function EditorPage() {
  const { documents, activeDocId, setActiveDocument, closeDocument } = useDocumentsStore();

  return (
    <div className="flex flex-col h-screen">
      {/* RIBBON BAR */}
      <RibbonBar />

      {/* DOCUMENT TABS - Only show when documents exist */}
      {documents.length > 0 && (
        <div className="flex bg-white border-b overflow-x-auto">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className={`flex items-center gap-2 px-4 py-2 border-r cursor-pointer whitespace-nowrap ${
                activeDocId === doc.id ? 'bg-blue-50 border-b-2 border-blue-600' : 'hover:bg-gray-100'
              }`}
              onClick={() => setActiveDocument(doc.id)}
            >
              <span className={`text-sm ${activeDocId === doc.id ? 'text-blue-600 font-medium' : 'text-gray-700'}`}>
                {doc.name}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeDocument(doc.id);
                }}
                className="text-gray-500 hover:text-red-600"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex flex-1 bg-gray-50" style={{ height: '100%', display: 'flex' }}>
        {/* SIDEBAR WITH HEIGHT CONSTRAINT */}
        <div className="w-80 h-full bg-white" style={{ height: '100%', minHeight: 0 }}>
          <Sidebar />
        </div>
        
        {/* CANVAS WITH HEIGHT CONSTRAINT */}
        <div className="flex-1 h-full" style={{ height: '100%', minHeight: 0 }}>
          <Canvas />
        </div>
        
        {/* COMMENTS PANEL */}
        <CommentsPanel />
      </div>
    </div>
  );
}