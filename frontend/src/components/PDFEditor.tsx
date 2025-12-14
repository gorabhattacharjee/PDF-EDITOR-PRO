"use client";

import React, { useState } from "react";
import RibbonBar from "@/components/RibbonBar";
import Sidebar from "@/components/Sidebar";
import Canvas from "@/components/Canvas";
import DocumentTabs from "@/components/DocumentTabs";
import DocumentPropertiesModal from "@/components/DocumentPropertiesModal";
import ToOfficeModal from "@/components/ToOfficeModal";
import ImageExportModal from "@/components/ImageExportModal";
import AddTextModal from "@/components/AddTextModal";
import AdSidebar from "@/components/AdSidebar";
import AdBottomBar from "@/components/AdBottomBar";

export default function PDFEditor() {
  const [showImageExport, setShowImageExport] = useState(false);
  return (
    <div className="flex flex-col w-full h-screen overflow-hidden relative">

      {/* RIBBON ALWAYS VISIBLE */}
      <div className="w-full flex-shrink-0">
        <RibbonBar onOpenImageExport={() => setShowImageExport(true)} />
      </div>

      {/* MAIN BODY AREA */}
      <div className="flex flex-col flex-1 overflow-hidden">
        
        {/* BODY AREA WITH AD SIDEBAR + THUMBNAILS + CANVAS */}
        <div className="flex flex-row flex-1 overflow-hidden">

          {/* LEFT AD SIDEBAR - 4 VERTICAL COMPARTMENTS */}
          <AdSidebar />

          {/* THUMBNAIL SIDEBAR ALWAYS VISIBLE */}
          <div className="w-64 border-r bg-white overflow-y-auto">
            <Sidebar />
          </div>

          {/* CANVAS AREA WITH TABS */}
          <div className="flex-1 bg-white overflow-hidden flex flex-col">
            <DocumentTabs />
            <div className="flex-1 overflow-y-auto">
              <Canvas />
            </div>
          </div>

        </div>

        {/* BOTTOM AD BAR - 4 HORIZONTAL COMPARTMENTS */}
        <AdBottomBar />

      </div>

      {/* DOCUMENT PROPERTIES MODAL */}
      <DocumentPropertiesModal />

      {/* TO OFFICE CONVERSION MODAL */}
      <ToOfficeModal />

      {/* IMAGE EXPORT MODAL */}
      <ImageExportModal
        isOpen={showImageExport}
        onClose={() => setShowImageExport(false)}
      />

      {/* ADD TEXT MODAL */}
      <AddTextModal />
    </div>
  );
}
