"use client";

import React, { useState, useEffect } from "react";
import { useUIStore } from "@/stores/useUIStore";
import useDocumentsStore from "@/stores/useDocumentsStore";
import { FaTimes } from "react-icons/fa";

const AVAILABLE_FONTS = [
  { value: "Helvetica", label: "Helvetica" },
  { value: "Helvetica-Bold", label: "Helvetica Bold" },
  { value: "Helvetica-Oblique", label: "Helvetica Italic" },
  { value: "TimesRoman", label: "Times New Roman" },
  { value: "TimesRoman-Bold", label: "Times New Roman Bold" },
  { value: "TimesRoman-Italic", label: "Times New Roman Italic" },
  { value: "Courier", label: "Courier" },
  { value: "Courier-Bold", label: "Courier Bold" },
  { value: "Courier-Oblique", label: "Courier Italic" },
];

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 48, 72];

export default function AddTextModal() {
  const isOpen = useUIStore((s) => s.isAddTextModalOpen);
  const closeModal = useUIStore((s) => s.closeAddTextModal);
  const setPendingAddTextConfig = useUIStore((s) => s.setPendingAddTextConfig);
  const setActiveTool = useUIStore((s) => s.setActiveTool);
  const activeDocument = useDocumentsStore((s) => s.activeDocument);

  const [text, setText] = useState("");
  const [fontFamily, setFontFamily] = useState("Helvetica");
  const [fontSize, setFontSize] = useState(14);
  const [fontColor, setFontColor] = useState("#000000");

  console.log('[AddTextModal] Render - isOpen:', isOpen);

  useEffect(() => {
    console.log('[AddTextModal] useEffect - isOpen changed to:', isOpen);
    if (isOpen) {
      setText("");
    }
  }, [isOpen]);

  const handleContinue = () => {
    if (!text.trim()) {
      alert("Please enter some text");
      return;
    }

    if (!activeDocument) {
      alert("Please open a PDF first, then click 'Add Text' again to place your text.");
      closeModal();
      return;
    }

    setPendingAddTextConfig({
      text: text.trim(),
      fontFamily,
      fontSize,
      fontColor,
    });
    setActiveTool("addText");
    closeModal();
  };

  const handleCancel = () => {
    setText("");
    closeModal();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={handleCancel}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          padding: "24px",
          minWidth: "400px",
          maxWidth: "500px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#1f2937" }}>
            Add Text
          </h2>
          <button
            onClick={handleCancel}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              color: "#6b7280",
            }}
          >
            <FaTimes size={18} />
          </button>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontSize: "14px",
              fontWeight: 500,
              color: "#374151",
            }}
          >
            Text Content
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter your text here..."
            autoFocus
            style={{
              width: "100%",
              minHeight: "80px",
              padding: "10px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
          <div style={{ flex: 1 }}>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
                fontSize: "14px",
                fontWeight: 500,
                color: "#374151",
              }}
            >
              Font Family
            </label>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
                backgroundColor: "white",
              }}
            >
              {AVAILABLE_FONTS.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ width: "100px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
                fontSize: "14px",
                fontWeight: 500,
                color: "#374151",
              }}
            >
              Font Size
            </label>
            <select
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
                backgroundColor: "white",
              }}
            >
              {FONT_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontSize: "14px",
              fontWeight: 500,
              color: "#374151",
            }}
          >
            Font Color
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <input
              type="color"
              value={fontColor}
              onChange={(e) => setFontColor(e.target.value)}
              style={{
                width: "50px",
                height: "36px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                cursor: "pointer",
                padding: "2px",
              }}
            />
            <input
              type="text"
              value={fontColor}
              onChange={(e) => setFontColor(e.target.value)}
              style={{
                width: "100px",
                padding: "8px 10px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
                fontFamily: "monospace",
              }}
            />
            <div style={{ display: "flex", gap: "4px" }}>
              {["#000000", "#FF0000", "#0000FF", "#008000", "#FFA500"].map((color) => (
                <button
                  key={color}
                  onClick={() => setFontColor(color)}
                  style={{
                    width: "24px",
                    height: "24px",
                    backgroundColor: color,
                    border: fontColor === color ? "2px solid #3b82f6" : "1px solid #d1d5db",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                  title={color}
                />
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: "12px",
            backgroundColor: "#f3f4f6",
            borderRadius: "6px",
            marginBottom: "20px",
          }}
        >
          <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>
            Preview:
          </div>
          <div
            style={{
              fontFamily: fontFamily.includes("Courier")
                ? "Courier, monospace"
                : fontFamily.includes("Times")
                ? "Times New Roman, serif"
                : "Helvetica, Arial, sans-serif",
              fontSize: `${Math.min(fontSize, 24)}px`,
              fontWeight: fontFamily.includes("Bold") ? "bold" : "normal",
              fontStyle: fontFamily.includes("Italic") || fontFamily.includes("Oblique") ? "italic" : "normal",
              color: fontColor,
              minHeight: "30px",
              wordBreak: "break-word",
            }}
          >
            {text || "Your text will appear here..."}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <button
            onClick={handleCancel}
            style={{
              padding: "10px 20px",
              backgroundColor: "#f3f4f6",
              color: "#374151",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleContinue}
            style={{
              padding: "10px 20px",
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Click to Place Text
          </button>
        </div>
      </div>
    </div>
  );
}
