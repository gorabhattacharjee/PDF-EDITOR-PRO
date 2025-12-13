"use client";

import React from "react";
import useDocumentsStore from "@/stores/useDocumentsStore";
import PageThumbnailPanel from "./PageThumbnailPanel";

export default function Sidebar() {
  const activeDocument = useDocumentsStore((s) => s.activeDocument);

  /* ================================================================
        NO DOCUMENT LOADED → SHOW PLACEHOLDER
  ================================================================= */
  if (!activeDocument) {
    return (
      <div className="w-full h-full bg-white flex flex-col items-center justify-center text-gray-400 select-none p-4">
        <div className="text-lg font-semibold">No PDF Loaded</div>
        <div className="text-sm mt-1">Open a PDF to begin</div>
      </div>
    );
  }

  /* ================================================================
        DOCUMENT LOADED → USE PageThumbnailPanel (Scrollable)
  ================================================================= */
  return <PageThumbnailPanel />;
}
