'use client';

import { useDocumentsStore } from '@/stores/useDocumentsStore';

export default function TabsBar() {
  const { documents, activeDocId, setActiveDocument, closeDocument } =
    useDocumentsStore();

  if (documents.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-muted border-b overflow-x-auto">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className={`flex items-center gap-2 px-3 py-1 rounded cursor-pointer ${
            doc.id === activeDocId
              ? 'bg-white border'
              : 'bg-secondary hover:bg-accent'
          }`}
          onClick={() => setActiveDocument(doc.id)}
        >
          <span className="text-sm truncate max-w-[150px]">{doc.name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeDocument(doc.id);
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
