"use client";

import React from "react";
import useDocumentsStore from "@/stores/useDocumentsStore";
import { FiX } from "react-icons/fi";

export default function DocumentTabs() {
  const documents = useDocumentsStore((s) => s.documents);
  const activeDocId = useDocumentsStore((s) => s.activeDocId);
  const setActiveDocument = useDocumentsStore((s) => s.setActiveDocument);
  const closeDocument = useDocumentsStore((s) => s.closeDocument);

  if (documents.length === 0) return null;

  return (
    <div className="document-tabs" style={{
      display: 'flex',
      borderBottom: '1px solid #e5e7eb',
      backgroundColor: '#f9fafb',
      overflowX: 'auto',
      overflowY: 'hidden'
    }}>
      {documents.map((doc) => (
        <div
          key={doc.id}
          onClick={() => setActiveDocument(doc.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 12px',
            minWidth: '200px',
            cursor: 'pointer',
            borderBottom: activeDocId === doc.id ? '3px solid #3b82f6' : 'none',
            backgroundColor: activeDocId === doc.id ? '#ffffff' : '#f3f4f6',
            borderRight: '1px solid #e5e7eb',
            gap: '8px',
          }}
        >
          <span style={{
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: '14px',
          }}>
            {doc.name}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeDocument(doc.id);
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              color: '#6b7280',
            }}
            title="Close tab"
          >
            <FiX size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
