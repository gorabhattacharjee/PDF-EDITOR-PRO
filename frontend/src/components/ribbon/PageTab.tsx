"use client";

import React, { useRef } from "react";
import { useDocumentsStore } from "@/stores/useDocumentsStore";
import { useUIStore } from "@/stores/useUIStore";
import { PDFDocument, degrees } from "pdf-lib";
import logger from "@/utils/logger";
import RibbonButton from "./RibbonButton";
import toast from "react-hot-toast";
import {
  FaFileMedical,
  FaTrash,
  FaFileExport,
  FaRedo,
  FaUndo,
  FaListOl,
  FaCopy,
} from "react-icons/fa";

export default function PageTab() {
  const { activeDocument, closeDocument, openDocument } = useDocumentsStore();
  const activePage = useUIStore((s) => s.activePage);
  const setActivePage = useUIStore((s) => s.setActivePage);
  const insertFileRef = useRef<HTMLInputElement>(null);

  const ensureDoc = () => {
    if (!activeDocument) {
      alert("No active document");
      return false;
    }
    return true;
  };

  const deletePage = async () => {
    if (!ensureDoc()) return;
    
    const buf = await activeDocument.file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(buf);
    
    if (pdfDoc.getPageCount() <= 1) {
      alert("Cannot delete the only page in the document.");
      return;
    }

    pdfDoc.removePage(activePage);

    const bytes = await pdfDoc.save();
    const newFile = new File([new Uint8Array(bytes)], activeDocument.name, {
      type: "application/pdf",
    });

    closeDocument(activeDocument.id);
    await openDocument(newFile);
    
    if (activePage >= pdfDoc.getPageCount() - 1) {
      setActivePage(Math.max(0, activePage - 1));
    }

    toast.success("Page deleted successfully");
    logger.success("Page deleted.");
  };

  const extractPage = async () => {
    if (!ensureDoc()) return;

    const buf = await activeDocument.file.arrayBuffer();
    const pdf = await PDFDocument.load(buf);
    const out = await PDFDocument.create();

    const [copy] = await out.copyPages(pdf, [activePage]);
    out.addPage(copy);

    const bytes = await out.save();
    const newFile = new File(
      [new Uint8Array(bytes)],
      activeDocument.name.replace(".pdf", `_page${activePage + 1}.pdf`),
      { type: "application/pdf" }
    );

    await openDocument(newFile);
    toast.success(`Page ${activePage + 1} extracted to new tab`);
    logger.success("Page extracted.");
  };

  const insertBlankPage = async (position: 'before' | 'after') => {
    if (!ensureDoc()) return;
    
    try {
      const buf = await activeDocument.file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buf);
      
      const currentPage = pdfDoc.getPage(activePage);
      const { width, height } = currentPage.getSize();
      
      pdfDoc.insertPage(
        position === 'before' ? activePage : activePage + 1,
        [width, height]
      );
      
      const bytes = await pdfDoc.save();
      const newFile = new File([new Uint8Array(bytes)], activeDocument.name, {
        type: "application/pdf",
      });
      
      closeDocument(activeDocument.id);
      await openDocument(newFile);
      
      if (position === 'before') {
        setActivePage(activePage + 1);
      }
      
      toast.success(`Blank page inserted ${position} current page`);
      logger.success(`Blank page inserted ${position} page ${activePage + 1}`);
    } catch (err) {
      toast.error("Failed to insert page: " + err);
      logger.error("Insert page failed: " + err);
    }
  };

  const handleInsertFromFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeDocument) return;
    
    try {
      toast.loading("Inserting pages from file...", { id: "insert" });
      
      const currentBuf = await activeDocument.file.arrayBuffer();
      const currentPdf = await PDFDocument.load(currentBuf);
      
      const insertBuf = await file.arrayBuffer();
      const insertPdf = await PDFDocument.load(insertBuf);
      
      const insertPageCount = insertPdf.getPageCount();
      const copiedPages = await currentPdf.copyPages(insertPdf, insertPdf.getPageIndices());
      
      copiedPages.forEach((page, index) => {
        currentPdf.insertPage(activePage + 1 + index, page);
      });
      
      const bytes = await currentPdf.save();
      const newFile = new File([new Uint8Array(bytes)], activeDocument.name, {
        type: "application/pdf",
      });
      
      closeDocument(activeDocument.id);
      await openDocument(newFile);
      
      toast.success(`Inserted ${insertPageCount} pages from ${file.name}`, { id: "insert" });
      logger.success(`Inserted ${insertPageCount} pages from ${file.name}`);
    } catch (err) {
      toast.error("Failed to insert pages: " + err, { id: "insert" });
      logger.error("Insert from file failed: " + err);
    }
    
    if (insertFileRef.current) {
      insertFileRef.current.value = "";
    }
  };

  const rotatePage = async (angle: number) => {
    if (!ensureDoc()) return;
    
    try {
      const buf = await activeDocument.file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buf);
      
      const page = pdfDoc.getPage(activePage);
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees((currentRotation + angle) % 360));
      
      const bytes = await pdfDoc.save();
      const newFile = new File([new Uint8Array(bytes)], activeDocument.name, {
        type: "application/pdf",
      });
      
      closeDocument(activeDocument.id);
      await openDocument(newFile);
      setActivePage(activePage);
      
      toast.success(`Page rotated ${angle}°`);
      logger.success(`Page ${activePage + 1} rotated ${angle}°`);
    } catch (err) {
      toast.error("Failed to rotate page: " + err);
      logger.error("Rotate page failed: " + err);
    }
  };

  const reorderPages = async () => {
    if (!ensureDoc()) return;
    
    try {
      const buf = await activeDocument.file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buf);
      const totalPages = pdfDoc.getPageCount();
      
      if (totalPages < 2) {
        alert("Need at least 2 pages to reorder.");
        return;
      }
      
      const input = prompt(
        `REORDER PAGES\n\nCurrent page: ${activePage + 1} of ${totalPages}\n\nMove current page to position (1-${totalPages}):`
      );
      
      if (!input) return;
      
      const newPosition = parseInt(input) - 1;
      if (isNaN(newPosition) || newPosition < 0 || newPosition >= totalPages) {
        alert(`Invalid position. Enter a number between 1 and ${totalPages}.`);
        return;
      }
      
      if (newPosition === activePage) {
        toast.success("Page already at that position");
        return;
      }
      
      const newPdf = await PDFDocument.create();
      const pageIndices = Array.from({ length: totalPages }, (_, i) => i);
      
      pageIndices.splice(activePage, 1);
      pageIndices.splice(newPosition, 0, activePage);
      
      const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
      copiedPages.forEach(page => newPdf.addPage(page));
      
      const bytes = await newPdf.save();
      const newFile = new File([new Uint8Array(bytes)], activeDocument.name, {
        type: "application/pdf",
      });
      
      closeDocument(activeDocument.id);
      await openDocument(newFile);
      setActivePage(newPosition);
      
      toast.success(`Page moved to position ${newPosition + 1}`);
      logger.success(`Page reordered from ${activePage + 1} to ${newPosition + 1}`);
    } catch (err) {
      toast.error("Failed to reorder pages: " + err);
      logger.error("Reorder pages failed: " + err);
    }
  };

  const duplicatePage = async () => {
    if (!ensureDoc()) return;
    
    const countStr = prompt('DUPLICATE PAGE\n\nHow many copies? (1-100):', '1');
    if (!countStr) return;
    
    const count = parseInt(countStr);
    if (isNaN(count) || count < 1 || count > 100) {
      alert("Please enter a number between 1 and 100.");
      return;
    }
    
    try {
      toast.loading(`Creating ${count} copies...`, { id: "duplicate" });
      
      const buf = await activeDocument.file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buf);
      
      for (let i = 0; i < count; i++) {
        const [copiedPage] = await pdfDoc.copyPages(pdfDoc, [activePage]);
        pdfDoc.insertPage(activePage + 1 + i, copiedPage);
      }
      
      const bytes = await pdfDoc.save();
      const newFile = new File([new Uint8Array(bytes)], activeDocument.name, {
        type: "application/pdf",
      });
      
      closeDocument(activeDocument.id);
      await openDocument(newFile);
      
      toast.success(`Created ${count} copies of page ${activePage + 1}`, { id: "duplicate" });
      logger.success(`Duplicated page ${activePage + 1} ${count} times`);
    } catch (err) {
      toast.error("Failed to duplicate page: " + err, { id: "duplicate" });
      logger.error("Duplicate page failed: " + err);
    }
  };

  return (
    <>
      <div className="ribbon-row">
        <RibbonButton
          icon={<FaFileMedical />}
          label="Insert Page"
          onClick={() => {
            if (!ensureDoc()) return;
            const response = prompt('INSERT PAGE\n\n1 = Blank page (before current)\n2 = Blank page (after current)\n3 = From PDF file\n\nEnter 1-3:');
            if (response === '1') {
              insertBlankPage('before');
            } else if (response === '2') {
              insertBlankPage('after');
            } else if (response === '3') {
              insertFileRef.current?.click();
            }
          }}
        />
        <RibbonButton
          icon={<FaTrash />}
          label="Delete Page"
          onClick={deletePage}
        />
        <RibbonButton
          icon={<FaFileExport />}
          label="Extract Page"
          onClick={extractPage}
        />
        <RibbonButton
          icon={<FaRedo />}
          label="Rotate Page"
          onClick={() => {
            if (!ensureDoc()) return;
            const dir = prompt('ROTATE PAGE\n\n1 = 90° Clockwise\n2 = 90° Counter-clockwise\n3 = 180° Flip\n\nEnter 1-3:');
            if (dir === '1') rotatePage(90);
            else if (dir === '2') rotatePage(270);
            else if (dir === '3') rotatePage(180);
          }}
        />
        <RibbonButton
          icon={<FaUndo />}
          label="Reverse Rotate"
          onClick={() => rotatePage(270)}
        />
        <RibbonButton
          icon={<FaListOl />}
          label="Reorder Pages"
          onClick={reorderPages}
        />
        <RibbonButton
          icon={<FaCopy />}
          label="Duplicate Page"
          onClick={duplicatePage}
        />
      </div>
      
      <input
        type="file"
        accept="application/pdf"
        ref={insertFileRef}
        style={{ display: "none" }}
        onChange={handleInsertFromFile}
      />
    </>
  );
}
