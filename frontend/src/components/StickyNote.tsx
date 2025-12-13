"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAnnotationsStore, StickyNote as StickyNoteType } from "@/stores/useAnnotationsStore";

const NOTE_COLORS = [
  "#FFF8A6",
  "#CCECFF",
  "#D9F5C6",
  "#FFD7E5",
  "#F4E1FF",
];

interface StickyNoteProps {
  note: StickyNoteType;
  docId: string;
  zoom: number;
}

const StickyNote: React.FC<StickyNoteProps> = ({ note, docId, zoom }) => {
  const [editText, setEditText] = useState(note.text);
  const [isExpanded, setIsExpanded] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const updateStickyNote = useAnnotationsStore((s) => s.updateStickyNote);
  const deleteStickyNote = useAnnotationsStore((s) => s.deleteStickyNote);
  
  useEffect(() => {
    setEditText(note.text);
  }, [note.text]);
  
  const handleSave = () => {
    updateStickyNote(docId, note.id, { text: editText });
  };
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteStickyNote(docId, note.id);
  };
  
  const handleColorChange = (color: string) => {
    updateStickyNote(docId, note.id, { color });
  };

  if (!isExpanded) {
    return (
      <div
        style={{
          position: "absolute",
          left: `${note.x * zoom}px`,
          top: `${note.y * zoom}px`,
          zIndex: 200,
        }}
        onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          style={{
            width: "24px",
            height: "24px",
            backgroundColor: note.color,
            borderRadius: "4px",
            cursor: "pointer",
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
          }}
          title={note.text || "Click to expand"}
        >
          📝
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        left: `${note.x * zoom}px`,
        top: `${note.y * zoom}px`,
        zIndex: 200,
        width: "180px",
        minHeight: "120px",
        backgroundColor: note.color,
        borderRadius: "6px",
        boxShadow: "0 3px 10px rgba(0,0,0,0.25)",
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 8px",
          borderBottom: "1px solid rgba(0,0,0,0.1)",
          fontSize: "11px",
          fontWeight: "600",
        }}
      >
        <span>📝 Note</span>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {NOTE_COLORS.map((c) => (
            <button
              key={c}
              onClick={(e) => { e.stopPropagation(); handleColorChange(c); }}
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                border: c === note.color ? "2px solid #333" : "1px solid rgba(0,0,0,0.2)",
                backgroundColor: c,
                cursor: "pointer",
              }}
            />
          ))}
          <button
            onClick={() => setIsExpanded(false)}
            style={{
              marginLeft: "4px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              opacity: 0.6,
            }}
            title="Minimize"
          >
            −
          </button>
          <button
            onClick={handleDelete}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "11px",
              color: "#c00",
            }}
            title="Delete"
          >
            ✕
          </button>
        </div>
      </div>

      <textarea
        ref={textareaRef}
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
        onBlur={handleSave}
        style={{
          width: "100%",
          minHeight: "80px",
          padding: "8px",
          fontSize: "11px",
          backgroundColor: "transparent",
          border: "none",
          resize: "none",
          outline: "none",
          fontFamily: "inherit",
        }}
        placeholder="Type your note..."
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

export default StickyNote;
