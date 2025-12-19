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
import useDocumentsStore from "@/stores/useDocumentsStore";
import useUIStore from "@/stores/useUIStore";

export default function PDFEditor() {
  const activeDocument = useDocumentsStore((s) => s.activeDocument);
  const activePage = useUIStore((s) => s.activePage);
  const showImageExport = useUIStore((s) => s.isImageExportModalOpen);
  const closeImageExport = useUIStore((s) => s.closeImageExportModal);
  return (
    <div className="flex flex-col w-full h-screen overflow-hidden relative">

      {/* RIBBON ALWAYS VISIBLE */}
      <div className="w-full flex-shrink-0">
        <RibbonBar />
      </div>

      {/* MAIN BODY AREA */}
      <div className="flex flex-col flex-1 overflow-hidden">
        
        {/* BODY AREA WITH THUMBNAILS + CANVAS + AD SIDEBAR */}
        <div className="flex flex-row flex-1 overflow-hidden">

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

          {/* RIGHT AD SIDEBAR - 4 VERTICAL COMPARTMENTS */}
          <AdSidebar />

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
        isOpen={showImageExport && !!activeDocument}
        onClose={() => closeImageExport()}
        documentName={activeDocument?.name || ""}
        currentPage={activePage || 1}
        totalPages={activeDocument?.numPages || 1}
        pdfFile={activeDocument?.file}
      />

      {/* ADD TEXT MODAL */}
      <AddTextModal />
    </div>
  );
}
