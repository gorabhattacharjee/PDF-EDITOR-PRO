"use client";

import React, { useRef } from "react";
import useDocumentsStore from "@/stores/useDocumentsStore";
import logger from "@/utils/logger";
import { openPDFandGenerate } from "@/components/openDocument";

const WelcomeBox: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleOpenClick = () => fileInputRef.current?.click();

  const handleOpenChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const loaded = await openPDFandGenerate(file);
      // Manually add document to store using the internal structure
      const { documents } = useDocumentsStore.getState();
      useDocumentsStore.setState({
        documents: [...documents, loaded as any],
        activeDocId: loaded.id,
        activeDocument: loaded as any,
      });
      logger.success("PDF loaded from WelcomeBox → " + file.name);
    } catch (err) {
      logger.error("Failed to open PDF from WelcomeBox → " + err);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">Welcome to PDF Editor Pro</h1>

        <button
          onClick={handleOpenClick}
          className="welcome-open-button inline-flex items-center gap-3"
        >
          📂 Open PDF
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          style={{ display: "none" }}
          onChange={handleOpenChange}
        />
      </div>
    </div>
  );
};

export default WelcomeBox;
