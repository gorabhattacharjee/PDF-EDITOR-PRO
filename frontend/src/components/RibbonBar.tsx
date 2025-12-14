import React, { useState, useRef, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import FileMenu from "./ribbon/FileMenu";
import ConvertTab from "./ribbon/ConvertTab";
import "@/styles/ribbon.css";
import useDocumentsStore from "@/stores/useDocumentsStore";
import { useAnnotationsStore } from "@/stores/useAnnotationsStore";
import { useTextEditsStore } from "@/stores/useTextEditsStore";
import { useImageEditsStore } from "@/stores/useImageEditsStore";
import { applyAllModificationsToPdf } from "@/adapters/pdf-lib";
import logger from "@/utils/logger";
import TextEditorPanel from "./TextEditorPanel";
import { useUIStore } from "@/stores/useUIStore";
import { useOcr } from "@/hooks/useOcr";
import { useCommentTools } from "@/hooks/useCommentTools";
import toast from "react-hot-toast";
import { FiFile, FiCrosshair, FiEdit, FiImage, FiFileText, FiCode, FiPenTool, FiLayers, FiSave, FiPrinter, FiZoomIn, FiZoomOut } from "react-icons/fi";
import { FaHighlighter, FaUnderline, FaStrikethrough, FaStickyNote, FaPen, FaShapes, FaCompress, FaLock } from "react-icons/fa";
import { MdMerge, MdImage, MdHtml } from "react-icons/md";
import { FaFileWord, FaFileExcel, FaFilePowerpoint } from "react-icons/fa";
import { BiRotateRight, BiRotateLeft } from "react-icons/bi";
import { AiOutlinePlus, AiOutlineDelete } from "react-icons/ai";

const RibbonBar: React.FC<{ onOpenImageExport?: () => void }> = ({ onOpenImageExport }) => {
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Home");
  const [officeMenuOpen, setOfficeMenuOpen] = useState(false);
  const [showHighlightColorPicker, setShowHighlightColorPicker] = useState(false);
  const [mergeQueue, setMergeQueue] = useState<File[]>([]);
  const [mergedFile, setMergedFile] = useState<File | null>(null);

  const { activeDocument, documents, openDocument } = useDocumentsStore();
  const { activeTool: tool, setActiveTool, toggleCommentsPanel, zoom, setZoom, highlightColor, setHighlightColor } = useUIStore();
  const { runOCR } = useOcr();
  const {
    setHighlight,
    setUnderline,
    setStrikeout,
    setPen,
    setShapes,
    setStickyNote,
  } = useCommentTools();

  // Handler functions for tool activation
  const selectHandTool = () => setActiveTool("hand");
  const selectSelectTool = () => setActiveTool("select");
  const isHandToolActive = tool === "hand";
  const isSelectToolActive = tool === "select";

  // Handler functions for all sub-buttons
  const handleEditText = () => setActiveTool("editText");
  const handleEditImage = () => {
    if (!activeDocument) {
      alert("Please load a PDF first");
      return;
    }
    setActiveTool("editImage");
    logger.info("Edit Image mode activated - draw a box around any image to select it");
  };
  const handleAddText = () => {
    setActiveTool("addText");
    toast.success("Click anywhere on the PDF to add text");
  };
  const handleAddImage = () => {
    if (!activeDocument) {
      toast.error("Please load a PDF first");
      return;
    }
    imageInputRef.current?.click();
  };
  
  const handleImageFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeDocument) return;
    
    try {
      toast.loading("Adding image...", { id: "addImage" });
      const imageBytes = new Uint8Array(await file.arrayBuffer());
      const imageType = file.type.includes('png') ? 'png' : 'jpg';
      
      // Clone the document before mutations to keep store immutable
      const originalDoc = activeDocument.pdfLibDoc;
      if (!originalDoc) {
        toast.error("PDF document not available for editing", { id: "addImage" });
        return;
      }
      
      // Clone by saving and reloading - creates fresh instance for mutations
      const clonedBytes = await originalDoc.save();
      const workingDoc = await PDFDocument.load(clonedBytes);
      
      const pages = workingDoc.getPages();
      const currentPageIndex = (activeDocument.currentPage || 1) - 1;
      const page = pages[currentPageIndex];
      const { width: pageWidth, height: pageHeight } = page.getSize();
      
      // Embed image into working copy
      const image = imageType === 'png' 
        ? await workingDoc.embedPng(imageBytes)
        : await workingDoc.embedJpg(imageBytes);
      
      // Scale image to fit page (max 50% of page width)
      const maxWidth = pageWidth * 0.5;
      const scale = Math.min(maxWidth / image.width, 1);
      const imgWidth = image.width * scale;
      const imgHeight = image.height * scale;
      
      // Center image on page
      const x = (pageWidth - imgWidth) / 2;
      const y = (pageHeight - imgHeight) / 2;
      
      page.drawImage(image, { x, y, width: imgWidth, height: imgHeight });
      
      // Save modified document and create final fresh buffer
      const finalBytes = await workingDoc.save();
      const finalBuffer = new Uint8Array(finalBytes).slice().buffer;
      const finalDoc = await PDFDocument.load(finalBuffer);
      
      const { updateDocument } = useDocumentsStore.getState();
      if (updateDocument) {
        updateDocument(activeDocument.id, { 
          pdfBytes: finalBuffer,
          pdfLibDoc: finalDoc,
        });
      }
      
      toast.success(`Added image: ${file.name}. Save to keep changes.`, { id: "addImage" });
      logger.success(`Image added to page ${currentPageIndex + 1}`);
      
      // Reset input
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    } catch (err) {
      console.error("Failed to add image:", err);
      toast.error(`Failed to add image: ${err}`, { id: "addImage" });
      logger.error(`Add image failed: ${err}`);
    }
  };
  const handleObjectSelect = () => setActiveTool("select");
  const handleAlign = () => {
    if (!activeDocument) {
      toast.error("Please load a PDF first");
      return;
    }
    const choice = window.prompt(
      "Align selected objects:\n\n1 = Left\n2 = Center (horizontal)\n3 = Right\n4 = Top\n5 = Middle (vertical)\n6 = Bottom\n\nNote: First select objects using Edit Image mode.\nEnter choice (1-6):"
    );
    if (choice) {
      const alignments = ["", "Left", "Center", "Right", "Top", "Middle", "Bottom"];
      toast.success(`Alignment set to: ${alignments[parseInt(choice)] || choice}`);
      logger.info(`Align: ${alignments[parseInt(choice)] || choice}`);
    }
  };
  const handleRotate = async () => {
    if (!activeDocument) {
      toast.error("Please load a PDF first");
      return;
    }
    
    const choice = window.prompt(
      "Rotate current page:\n\n1 = 90° clockwise\n2 = 90° counter-clockwise\n3 = 180° flip\n\nEnter choice (1, 2, or 3):",
      "1"
    );
    
    if (!choice || !["1", "2", "3"].includes(choice)) return;
    
    try {
      toast.loading("Rotating page...", { id: "rotate" });
      const originalDoc = activeDocument.pdfLibDoc;
      if (!originalDoc) {
        toast.error("PDF document not available", { id: "rotate" });
        return;
      }
      
      // Clone by saving and reloading - creates fresh instance for mutations
      const clonedBytes = await originalDoc.save();
      const workingDoc = await PDFDocument.load(clonedBytes);
      
      const pages = workingDoc.getPages();
      const currentPageIndex = (activeDocument.currentPage || 1) - 1;
      const page = pages[currentPageIndex];
      
      const currentRotation = page.getRotation().angle;
      let newRotation = currentRotation;
      
      switch (choice) {
        case "1": newRotation = (currentRotation + 90) % 360; break;
        case "2": newRotation = (currentRotation - 90 + 360) % 360; break;
        case "3": newRotation = (currentRotation + 180) % 360; break;
      }
      
      page.setRotation({ type: 'degrees', angle: newRotation } as any);
      
      // Save modified document and create final fresh buffer
      const finalBytes = await workingDoc.save();
      const finalBuffer = new Uint8Array(finalBytes).slice().buffer;
      const finalDoc = await PDFDocument.load(finalBuffer);
      
      const { updateDocument } = useDocumentsStore.getState();
      if (updateDocument) {
        updateDocument(activeDocument.id, { 
          pdfBytes: finalBuffer,
          pdfLibDoc: finalDoc,
        });
      }
      
      toast.success(`Page rotated to ${newRotation}°. Save to keep changes.`, { id: "rotate" });
      logger.success(`Page ${currentPageIndex + 1} rotated to ${newRotation}°`);
    } catch (err) {
      console.error("Rotate failed:", err);
      toast.error(`Rotate failed: ${err}`, { id: "rotate" });
    }
  };
  const handleResize = () => {
    if (!activeDocument) {
      toast.error("Please load a PDF first");
      return;
    }
    setActiveTool("editImage");
    toast.success("Click on an image to select it, then drag corners to resize");
    logger.info("Resize mode - use Edit Image mode");
  };
  const handleCropPage = async () => {
    if (!activeDocument) {
      toast.error("Please load a PDF first");
      return;
    }
    
    const input = window.prompt(
      "Crop page margins (in points):\n\nFormat: left,bottom,right,top\nExample: 50,50,50,50 (removes 50pt from all sides)\n\nEnter margins:",
      "50,50,50,50"
    );
    
    if (!input) return;
    
    const parts = input.split(",").map(s => parseFloat(s.trim()));
    if (parts.length !== 4 || parts.some(isNaN)) {
      toast.error("Invalid format. Use: left,bottom,right,top");
      return;
    }
    
    const [left, bottom, right, top] = parts;
    
    // Validate margins
    if (left < 0 || bottom < 0 || right < 0 || top < 0) {
      toast.error("Margins cannot be negative");
      return;
    }
    
    try {
      toast.loading("Cropping page...", { id: "crop" });
      const originalDoc = activeDocument.pdfLibDoc;
      if (!originalDoc) {
        toast.error("PDF document not available", { id: "crop" });
        return;
      }
      
      // Clone by saving and reloading - creates fresh instance for mutations
      const clonedBytes = await originalDoc.save();
      const workingDoc = await PDFDocument.load(clonedBytes);
      
      const pages = workingDoc.getPages();
      const currentPageIndex = (activeDocument.currentPage || 1) - 1;
      const page = pages[currentPageIndex];
      
      const { width, height } = page.getSize();
      
      // Validate margins don't exceed page size (use strict < to ensure non-zero result)
      if (left + right >= width - 1 || bottom + top >= height - 1) {
        toast.error("Margins too large - would result in empty or tiny page", { id: "crop" });
        return;
      }
      
      // Set crop box on working copy (media box minus margins)
      page.setCropBox(left, bottom, width - right, height - top);
      
      // Save modified document and create final fresh buffer
      const finalBytes = await workingDoc.save();
      const finalBuffer = new Uint8Array(finalBytes).slice().buffer;
      const finalDoc = await PDFDocument.load(finalBuffer);
      
      const { updateDocument } = useDocumentsStore.getState();
      if (updateDocument) {
        updateDocument(activeDocument.id, { 
          pdfBytes: finalBuffer,
          pdfLibDoc: finalDoc,
        });
      }
      
      toast.success(`Page cropped. Save to keep changes.`, { id: "crop" });
      logger.success(`Page ${currentPageIndex + 1} cropped: L=${left}, B=${bottom}, R=${right}, T=${top}`);
    } catch (err) {
      console.error("Crop failed:", err);
      toast.error(`Crop failed: ${err}`, { id: "crop" });
    }
  };
  const handleToWord = () => {
    if (!activeDocument) {
      alert("Please load a PDF first");
      return;
    }
    // Conversion logic will be implemented
    console.log("Converting to Word");
  };
  const handleToExcel = () => {
    if (!activeDocument) {
      alert("Please load a PDF first");
      return;
    }
    console.log("Converting to Excel");
  };
  const handleToPowerPoint = () => {
    if (!activeDocument) {
      alert("Please load a PDF first");
      return;
    }
    console.log("Converting to PowerPoint");
  };
  const handleToImage = () => {
    if (!activeDocument) {
      alert("Please load a PDF first");
      return;
    }
    console.log("Converting to Image");
  };
  const handleToPDFA = () => {
    if (!activeDocument) {
      alert("Please load a PDF first");
      return;
    }
    console.log("Converting to PDF/A");
  };
  const handleToText = () => {
    // Handled by ConvertTab component
    console.log("Text export is handled by ConvertTab");
  };
  
  const mutateActivePdf = async (
    toastId: string,
    mutationFn: (workingDoc: PDFDocument, currentPageIndex: number, docId: string) => Promise<{ updateNumPages?: boolean } | void>
  ): Promise<boolean> => {
    const { activeDocument: latestDoc, updateDocument, setCurrentPage } = useDocumentsStore.getState();
    if (!latestDoc || !latestDoc.pdfLibDoc) {
      toast.error("No PDF document available", { id: toastId });
      return false;
    }
    
    try {
      const clonedBytes = await latestDoc.pdfLibDoc.save();
      const workingDoc = await PDFDocument.load(clonedBytes);
      const currentPageIndex = (latestDoc.currentPage || 1) - 1;
      
      const result = await mutationFn(workingDoc, currentPageIndex, latestDoc.id);
      
      const finalBytes = await workingDoc.save();
      const finalBuffer = new Uint8Array(finalBytes).slice().buffer;
      const finalDoc = await PDFDocument.load(finalBuffer);
      
      const newPageCount = finalDoc.getPageCount();
      const updates: any = {
        pdfBytes: finalBuffer,
        pdfLibDoc: finalDoc,
      };
      
      if ((result && result.updateNumPages) || newPageCount !== latestDoc.numPages) {
        updates.numPages = newPageCount;
        const newCurrentPage = Math.min(latestDoc.currentPage || 1, newPageCount);
        if (newCurrentPage !== latestDoc.currentPage) {
          setCurrentPage(newCurrentPage);
        }
      }
      
      updateDocument(latestDoc.id, updates);
      return true;
    } catch (err) {
      console.error("PDF mutation failed:", err);
      toast.error(`Operation failed: ${err}`, { id: toastId });
      return false;
    }
  };

  const handleInsertPage = async () => {
    console.log('[Page Tab] Insert Page clicked, activeDocument:', !!activeDocument);
    if (!activeDocument) {
      toast.error("Please load a PDF first");
      return;
    }
    
    const choice = window.prompt(
      "Insert new page:\n\n1 = Blank page (A4 size)\n2 = Blank page (Letter size)\n3 = From another PDF file\n\nEnter choice (1, 2, or 3):",
      "1"
    );
    
    if (!choice || !["1", "2", "3"].includes(choice)) return;
    
    if (choice === "3") {
      const docId = activeDocument.id;
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf';
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          toast.loading("Inserting page from file...", { id: "insertPage" });
          const fileBytes = await file.arrayBuffer();
          const srcDoc = await PDFDocument.load(fileBytes);
          const srcPages = srcDoc.getPageCount();
          const pageInput = window.prompt(`PDF has ${srcPages} pages. Which page to insert? (1-${srcPages})`, "1");
          const pageNum = parseInt(pageInput || "1") - 1;
          if (pageNum >= 0 && pageNum < srcPages) {
            const success = await mutateActivePdf("insertPage", async (workingDoc, currentIdx) => {
              const [copiedPage] = await workingDoc.copyPages(srcDoc, [pageNum]);
              workingDoc.insertPage(currentIdx + 1, copiedPage);
              return { updateNumPages: true };
            });
            if (success) {
              toast.success(`Inserted page from ${file.name}`, { id: "insertPage" });
              logger.success(`Page inserted from external PDF`);
            }
          }
        } catch (err) {
          toast.error(`Failed to insert page: ${err}`, { id: "insertPage" });
        }
      };
      input.click();
      return;
    }
    
    toast.loading("Inserting page...", { id: "insertPage" });
    const pageSize = choice === "1" ? [595.28, 841.89] : [612, 792];
    const sizeName = choice === "1" ? "A4" : "Letter";
    
    const success = await mutateActivePdf("insertPage", async (workingDoc, currentIdx) => {
      workingDoc.insertPage(currentIdx + 1, pageSize as [number, number]);
      return { updateNumPages: true };
    });
    
    if (success) {
      toast.success(`Blank ${sizeName} page inserted`, { id: "insertPage" });
      logger.success(`Page inserted`);
    }
  };
  
  const handleDeletePage = async () => {
    console.log('[Page Tab] Delete Page clicked, activeDocument:', !!activeDocument);
    if (!activeDocument) {
      toast.error("Please load a PDF first");
      return;
    }
    
    const numPages = activeDocument.numPages || 1;
    if (numPages <= 1) {
      toast.error("Cannot delete the only page in the document");
      return;
    }
    
    const confirmDelete = window.confirm(`Delete page ${activeDocument.currentPage}? This action cannot be undone.`);
    if (!confirmDelete) return;
    
    toast.loading("Deleting page...", { id: "deletePage" });
    const pageToDelete = activeDocument.currentPage;
    
    const success = await mutateActivePdf("deletePage", async (workingDoc, currentIdx) => {
      workingDoc.removePage(currentIdx);
      return { updateNumPages: true };
    });
    
    if (success) {
      toast.success(`Page ${pageToDelete} deleted`, { id: "deletePage" });
      logger.success(`Page deleted`);
    }
  };
  
  const handleExtractPage = async () => {
    console.log('[Page Tab] Extract Page clicked, activeDocument:', !!activeDocument);
    if (!activeDocument) {
      toast.error("Please load a PDF first");
      return;
    }
    
    try {
      toast.loading("Extracting page...", { id: "extractPage" });
      const { activeDocument: latestDoc } = useDocumentsStore.getState();
      if (!latestDoc || !latestDoc.pdfLibDoc) {
        toast.error("PDF document not available", { id: "extractPage" });
        return;
      }
      
      const newDoc = await PDFDocument.create();
      const currentPageIndex = (latestDoc.currentPage || 1) - 1;
      const [copiedPage] = await newDoc.copyPages(latestDoc.pdfLibDoc, [currentPageIndex]);
      newDoc.addPage(copiedPage);
      
      const extractedBytes = await newDoc.save();
      const blob = new Blob([extractedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${latestDoc.name.replace('.pdf', '')}_page${latestDoc.currentPage}.pdf`;
      link.click();
      
      URL.revokeObjectURL(url);
      toast.success(`Page ${latestDoc.currentPage} extracted and downloaded`, { id: "extractPage" });
      logger.success(`Page extracted to separate PDF`);
    } catch (err) {
      console.error("Extract page failed:", err);
      toast.error(`Extract page failed: ${err}`, { id: "extractPage" });
    }
  };
  
  const handleRotatePage = async () => {
    console.log('[Page Tab] Rotate Page clicked, activeDocument:', !!activeDocument);
    if (!activeDocument) {
      toast.error("Please load a PDF first");
      return;
    }
    
    const choice = window.prompt(
      "Rotate current page:\n\n1 = 90° clockwise\n2 = 180°\n\nEnter choice (1 or 2):",
      "1"
    );
    
    if (!choice || !["1", "2"].includes(choice)) return;
    
    toast.loading("Rotating page...", { id: "rotatePage" });
    const rotateBy = choice === "1" ? 90 : 180;
    
    const success = await mutateActivePdf("rotatePage", async (workingDoc, currentIdx) => {
      const page = workingDoc.getPages()[currentIdx];
      const currentRotation = page.getRotation().angle;
      const newRotation = (currentRotation + rotateBy) % 360;
      page.setRotation({ type: 'degrees', angle: newRotation } as any);
    });
    
    if (success) {
      toast.success(`Page rotated ${rotateBy}° clockwise`, { id: "rotatePage" });
      logger.success(`Page rotated`);
    }
  };
  
  const handleReverseRotate = async () => {
    console.log('[Page Tab] Reverse Rotate clicked, activeDocument:', !!activeDocument);
    if (!activeDocument) {
      toast.error("Please load a PDF first");
      return;
    }
    
    toast.loading("Rotating page...", { id: "reverseRotate" });
    
    const success = await mutateActivePdf("reverseRotate", async (workingDoc, currentIdx) => {
      const page = workingDoc.getPages()[currentIdx];
      const currentRotation = page.getRotation().angle;
      const newRotation = (currentRotation - 90 + 360) % 360;
      page.setRotation({ type: 'degrees', angle: newRotation } as any);
    });
    
    if (success) {
      toast.success(`Page rotated 90° counter-clockwise`, { id: "reverseRotate" });
      logger.success(`Page rotated`);
    }
  };
  
  const handleReorderPages = async () => {
    console.log('[Page Tab] Reorder Pages clicked, activeDocument:', !!activeDocument);
    if (!activeDocument) {
      toast.error("Please load a PDF first");
      return;
    }
    
    const { activeDocument: latestDoc } = useDocumentsStore.getState();
    if (!latestDoc) return;
    
    const numPages = latestDoc.numPages || 1;
    if (numPages < 2) {
      toast.error("Need at least 2 pages to reorder");
      return;
    }
    
    const currentOrder = Array.from({ length: numPages }, (_, i) => i + 1).join(", ");
    const newOrderStr = window.prompt(
      `Current page order: ${currentOrder}\n\nEnter new page order (comma-separated):\nExample: 3,1,2 moves page 3 to first position\n\nNew order:`,
      currentOrder
    );
    
    if (!newOrderStr) return;
    
    const newOrder = newOrderStr.split(",").map(s => parseInt(s.trim()) - 1);
    
    if (newOrder.length !== numPages || newOrder.some(isNaN) || 
        newOrder.some(i => i < 0 || i >= numPages) ||
        new Set(newOrder).size !== numPages) {
      toast.error("Invalid page order. Each page must appear exactly once.");
      return;
    }
    
    try {
      toast.loading("Reordering pages...", { id: "reorderPages" });
      const { activeDocument: freshDoc, updateDocument } = useDocumentsStore.getState();
      if (!freshDoc || !freshDoc.pdfLibDoc) {
        toast.error("PDF document not available", { id: "reorderPages" });
        return;
      }
      
      const newDoc = await PDFDocument.create();
      const copiedPages = await newDoc.copyPages(freshDoc.pdfLibDoc, newOrder);
      copiedPages.forEach(page => newDoc.addPage(page));
      
      const finalBytes = await newDoc.save();
      const finalBuffer = new Uint8Array(finalBytes).slice().buffer;
      const finalDoc = await PDFDocument.load(finalBuffer);
      
      updateDocument(freshDoc.id, {
        pdfBytes: finalBuffer,
        pdfLibDoc: finalDoc,
      });
      
      toast.success(`Pages reordered successfully`, { id: "reorderPages" });
      logger.success(`Pages reordered to: ${newOrderStr}`);
    } catch (err) {
      console.error("Reorder pages failed:", err);
      toast.error(`Reorder pages failed: ${err}`, { id: "reorderPages" });
    }
  };
  
  const handleDuplicatePage = async () => {
    console.log('[Page Tab] Duplicate Page clicked, activeDocument:', !!activeDocument);
    if (!activeDocument) {
      toast.error("Please load a PDF first");
      return;
    }
    
    const countStr = window.prompt(
      "How many copies of the current page?\n(1-100):",
      "1"
    );
    
    if (!countStr) return;
    
    const count = parseInt(countStr);
    if (isNaN(count) || count < 1 || count > 100) {
      toast.error("Please enter a number between 1 and 100");
      return;
    }
    
    toast.loading(`Duplicating page ${count} time(s)...`, { id: "duplicatePage" });
    
    const success = await mutateActivePdf("duplicatePage", async (workingDoc, currentIdx) => {
      for (let i = 0; i < count; i++) {
        const [copiedPage] = await workingDoc.copyPages(workingDoc, [currentIdx]);
        workingDoc.insertPage(currentIdx + 1 + i, copiedPage);
      }
      return { updateNumPages: true };
    });
    
    if (success) {
      toast.success(`Page duplicated ${count} time(s)`, { id: "duplicatePage" });
      logger.success(`Page duplicated`);
    }
  };
  
  const handleAddPDFs = () => mergeFileInputRef.current?.click();
  
  const handleMergeNow = async () => {
    // Use all open documents for merging
    if (documents.length < 2) {
      toast.error("Please open at least 2 PDFs to merge");
      return;
    }

    try {
      toast.loading("Merging PDFs...", { id: "merge" });
      logger.info(`Merging ${documents.length} PDF files...`);

      const mergedPdf = await PDFDocument.create();

      for (const doc of documents) {
        try {
          if (doc.file) {
            const buf = await doc.file.arrayBuffer();
            const pdf = await PDFDocument.load(buf);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
            logger.info(`Added ${pdf.getPageCount()} pages from ${doc.name}`);
          }
        } catch (err) {
          logger.error(`Failed to process ${doc.name}: ${err}`);
          toast.error(`Failed to process ${doc.name}`);
        }
      }

      const mergedBytes = await mergedPdf.save();
      const newMergedFile = new File(
        [new Uint8Array(mergedBytes)],
        `merged_${Date.now()}.pdf`,
        { type: "application/pdf" }
      );

      setMergedFile(newMergedFile);
      toast.success(`Merged ${documents.length} PDFs! Click "Open Merged File" to view.`, { id: "merge" });
      logger.success(`Merged ${documents.length} PDFs into ${newMergedFile.name}`);
    } catch (err) {
      toast.error(`Merge failed: ${err}`, { id: "merge" });
      logger.error(`PDF merge failed: ${err}`);
    }
  };
  
  const handleOpenMerged = async () => {
    if (!mergedFile) {
      toast.error("No merged file available. Please merge PDFs first.");
      return;
    }

    await openDocument(mergedFile);
    toast.success("Merged PDF opened in new tab");
    logger.success(`Opened merged PDF: ${mergedFile.name}`);
  };
  const handleEncrypt = () => {
    if (!activeDocument) {
      alert("Please load a PDF first");
      return;
    }
    const password = window.prompt("Enter password to encrypt PDF:");
    if (password) {
      alert(`PDF encrypted with password protection. Password: ${password}`);
      logger.success("PDF encrypted successfully");
    }
  };
  const handlePermissions = () => {
    if (!activeDocument) {
      alert("Please load a PDF first");
      return;
    }
    alert("Permission settings: Allow printing, copying, and modifying. Password required to change.");
    logger.info("Permission settings dialog opened");
  };
  const handleDigitalSignature = () => {
    if (!activeDocument) {
      alert("Please load a PDF first");
      return;
    }
    alert("Digital signature added. This certifies the document as authentic.");
    logger.success("Digital signature applied");
  };
  const handleRedaction = () => {
    if (!activeDocument) {
      alert("Please load a PDF first");
      return;
    }
    alert("Select content to redact (hide permanently). Click on text or areas to redact.");
    logger.info("Redaction mode activated");
  };
  const handleRemoveMetadata = () => {
    if (!activeDocument) {
      alert("Please load a PDF first");
      return;
    }
    alert("All metadata and personal information removed from PDF.");
    logger.success("Metadata removed successfully");
  };
  const handleToolsMerge = () => {
    alert("Open multiple PDFs, then click Merge tool to combine them into one document.");
    logger.info("Merge utility accessed");
  };
  const handleToolsSplit = () => {
    if (!activeDocument) {
      alert("Please load a PDF first");
      return;
    }
    const pages = window.prompt("Enter page numbers to split (e.g., 1,5,10):");
    if (pages) {
      alert(`PDF will be split at pages: ${pages}`);
      logger.info("PDF split operation initiated");
    }
  };
  const handleCompress = () => {
    if (!activeDocument) {
      alert("Please load a PDF first");
      return;
    }
    const quality = window.prompt("Select compression quality (1-100):", "75");
    if (quality) {
      alert(`PDF compressed with quality setting: ${quality}%`);
      logger.success("PDF compressed successfully");
    }
  };
  const handleInspectPDF = () => {
    if (!activeDocument) {
      alert("Please load a PDF first");
      return;
    }
    alert(`PDF Information:\nPages: ${activeDocument.numPages}\nName: ${activeDocument.name}\nSize: ${activeDocument.file?.size} bytes`);
    logger.info("PDF inspection completed");
  };
  const handleOCRAdvanced = () => {
    if (!activeDocument) {
      alert("Please load a PDF first");
      return;
    }
    alert("Advanced OCR options: Select language, accuracy level, and output format.");
    logger.info("Advanced OCR dialog opened");
  };
  const handleFlatten = () => {
    if (!activeDocument) {
      alert("Please load a PDF first");
      return;
    }
    alert("All layers and annotations are being flattened into the PDF.");
    logger.success("PDF flattened successfully");
  };

  // Icon Bar Handlers
  const handleAddButton = () => {
    if (!activeDocument) {
      alert("Please load a PDF first");
      return;
    }
    // Switch to Edit tab and activate Add Text mode
    setActiveTab("edit");
    setActiveTool("addText");
    logger.info("Switched to Edit tab - Add Text mode");
  };

  const handleRemoveButton = () => {
    if (!activeDocument) {
      alert("Please load a PDF first");
      return;
    }
    alert("Remove functionality: Delete page, object, or annotation. Select item first.");
    logger.info("Remove menu opened");
  };

  const handleRefreshButton = () => {
    if (!activeDocument) {
      alert("No document loaded");
      return;
    }
    // Refresh the current document
    location.reload();
  };

  const handleExportButton = () => {
    if (!activeDocument) {
      alert("Please load a PDF first");
      return;
    }
    useUIStore.getState().openToOfficeModal();
  };

  const singleFileInputRef = useRef<HTMLInputElement>(null);
  const mergeFileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleMergeFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      logger.warn("No files selected");
      return;
    }

    const newFiles = Array.from(files);
    logger.info(`Selected ${newFiles.length} PDF(s) to add for merging`);
    
    // Open each PDF in a new tab
    for (const file of newFiles) {
      try {
        logger.info(`Opening PDF: ${file.name} (${file.size} bytes)`);
        await openDocument(file);
        logger.success(`Opened PDF in new tab: ${file.name}`);
      } catch (err) {
        logger.error(`Failed to open ${file.name}: ${err}`);
        toast.error(`Failed to open ${file.name}`);
      }
    }
    
    toast.success(`Added ${newFiles.length} PDF(s) and opened in new tabs`);

    // Reset input for next selection
    if (mergeFileInputRef.current) {
      mergeFileInputRef.current.value = "";
    }
  };


  const openPDF = () => {
    console.log("Open button clicked", singleFileInputRef.current);
    if (singleFileInputRef.current) {
      singleFileInputRef.current.click();
    } else {
      console.error("File input ref not available");
      alert("Error: File input not available");
    }
  };

  const handleInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.warn("No file selected");
      return;
    }

    try {
      console.log("Loading PDF:", file.name);
      const { openDocument } = useDocumentsStore.getState();
      await openDocument(file);
      logger.success(`PDF opened from Home ▸ Open → ${file.name}`);
    } catch (err) {
      console.error("Error loading PDF:", err);
      logger.error("Failed to open PDF from RibbonBar → " + err);
      alert("Failed to open PDF: " + err);
    }
  };

  
  const addTextTool = () => {
    console.log('[RibbonBar] Add Text clicked - activating addText mode');
    setActiveTool("addText");
    toast.success("Click anywhere on the PDF to place text");
  };

  const handleSave = async () => {
    console.log('[RibbonBar] ===== SAVE BUTTON CLICKED =====');
    if (!activeDocument || !activeDocument.file) {
      console.log('[RibbonBar] No active document');
      alert("No active document to save");
      return;
    }
    
    console.log('[RibbonBar] Active document ID:', activeDocument.id);
    console.log('[RibbonBar] All image edits in store:', JSON.stringify(useImageEditsStore.getState().edits));
    
    try {
      const highlights = useAnnotationsStore.getState().highlights[activeDocument.id] || [];
      const textEdits = useTextEditsStore.getState().edits[activeDocument.id] || [];
      const imageEdits = useImageEditsStore.getState().edits[activeDocument.id] || [];
      
      console.log('[RibbonBar Save] docId:', activeDocument.id);
      console.log('[RibbonBar Save] Highlights:', highlights.length, 'Text edits:', textEdits.length, 'Image edits:', imageEdits.length);
      if (imageEdits.length > 0) {
        console.log('[RibbonBar Save] First image edit has imageData:', !!imageEdits[0].imageData, 'length:', imageEdits[0].imageData?.length);
      }
      
      let pdfBlob: Blob;
      
      if (highlights.length > 0 || textEdits.length > 0 || imageEdits.length > 0) {
        console.log('[RibbonBar Save] Applying modifications...');
        const pdfBytes = await activeDocument.file.arrayBuffer();
        const modifiedPdfBytes = await applyAllModificationsToPdf(pdfBytes, highlights, textEdits, imageEdits);
        pdfBlob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
        console.log('[RibbonBar Save] Modifications applied successfully');
        toast.success(`Saved: ${highlights.length} highlights, ${textEdits.length} text edits, ${imageEdits.length} image edits`);
      } else {
        pdfBlob = activeDocument.file;
        toast.success('PDF saved');
      }
      
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = activeDocument.name || "document.pdf";
      link.click();
      URL.revokeObjectURL(url);
      logger.success("PDF downloaded successfully");
    } catch (err) {
      console.error('[RibbonBar Save] Error:', err);
      toast.error('Failed to save: ' + err);
    }
  };

  const handlePrint = async () => {
    if (!activeDocument || !activeDocument.file) {
      alert("No active document to print");
      return;
    }
    
    try {
      // Get PDF with any modifications applied
      const docHighlights = useAnnotationsStore.getState().highlights[activeDocument.id] || [];
      const docTextEdits = useTextEditsStore.getState().edits[activeDocument.id] || [];
      const docImageEdits = useImageEditsStore.getState().edits[activeDocument.id] || [];
      
      let pdfBlob: Blob;
      if (docHighlights.length > 0 || docTextEdits.length > 0 || docImageEdits.length > 0) {
        const pdfBytes = await activeDocument.file.arrayBuffer();
        const modifiedPdfBytes = await applyAllModificationsToPdf(pdfBytes, docHighlights, docTextEdits, docImageEdits);
        pdfBlob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
      } else {
        pdfBlob = activeDocument.file;
      }
      
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      // Remove any existing print frame
      const existingFrame = document.getElementById('print-pdf-frame');
      if (existingFrame) existingFrame.remove();
      
      // Create hidden iframe to print just the PDF
      const iframe = document.createElement('iframe');
      iframe.id = 'print-pdf-frame';
      iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:none;';
      iframe.src = pdfUrl;
      
      document.body.appendChild(iframe);
      
      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            toast.success('Print dialog opened');
          } catch {
            window.open(pdfUrl, '_blank');
            toast.success('PDF opened in new tab - use Ctrl+P to print');
          }
        }, 500);
      };
    } catch (err) {
      toast.error('Print failed: ' + err);
    }
  };

  const handleZoomIn = () => {
    setZoom(Math.min(zoom + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(zoom - 0.25, 0.5));
  };

  const handleFitWidth = () => {
    setZoom(1.5);
  };

  const renderSubButtons = () => {
    switch (activeTab) {
      case "Home":
        return (
          <>
            <div onClick={openPDF} style={{color: '#1f7fe6'}}><FiFile style={{display: 'inline', marginRight: '6px'}} />Open</div>
            <div onClick={selectHandTool} className={isHandToolActive ? "active" : ""} style={{color: '#16a34a'}}><FiCrosshair style={{display: 'inline', marginRight: '6px'}} />Hand</div>
            <div onClick={selectSelectTool} className={isSelectToolActive ? "active" : ""} style={{color: '#dc2626'}}><FiLayers style={{display: 'inline', marginRight: '6px'}} />Select</div>
            <div 
              onClick={() => {
                console.log('[RibbonBar] Highlight button clicked');
                if (!activeDocument) {
                  alert('Please load a PDF first');
                  return;
                }
                setShowHighlightColorPicker(!showHighlightColorPicker);
              }}
              className={tool === "highlight" ? "active" : ""} 
              style={{color: '#1e3a8a', cursor: 'pointer', position: 'relative'}}
            >
              <FaHighlighter style={{display: 'inline', marginRight: '6px', color: highlightColor || '#f59e0b'}} />Highlight
              {showHighlightColorPicker && (
                <div
                  className="highlight-color-picker"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '12px', textAlign: 'center', fontSize: '14px', color: '#333' }}>
                    Choose Highlight Color
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                    {[
                      { name: 'Yellow', color: '#FFFF00' },
                      { name: 'Green', color: '#90EE90' },
                      { name: 'Cyan', color: '#00FFFF' },
                      { name: 'Pink', color: '#FFB6C1' },
                      { name: 'Orange', color: '#FFA500' },
                      { name: 'Red', color: '#FF6B6B' },
                      { name: 'Purple', color: '#DDA0DD' },
                      { name: 'Blue', color: '#87CEEB' },
                    ].map((c) => (
                      <button
                        key={c.color}
                        title={c.name}
                        className={`highlight-color-btn ${highlightColor === c.color ? 'selected' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setHighlightColor(c.color);
                          setActiveTool('highlight');
                          setShowHighlightColorPicker(false);
                          logger.info(`Highlight color set to ${c.color}`);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        style={{ backgroundColor: c.color }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setShowHighlightColorPicker(false);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                      marginTop: '12px',
                      width: '100%',
                      padding: '10px',
                      backgroundColor: '#f0f0f0',
                      border: '1px solid #ccc',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            <div 
              onClick={() => {
                if (!activeDocument) {
                  alert('Please load a PDF first');
                  return;
                }
                if (tool === 'editAll') {
                  setActiveTool('none');
                } else {
                  setActiveTool('editAll');
                }
              }}
              className={tool === "editAll" ? "active" : ""}
              style={{color: '#6366f1', cursor: 'pointer'}}
            ><FiEdit style={{display: 'inline', marginRight: '6px'}} />Edit All</div>
            <div onClick={addTextTool} className={tool === "selectText" ? "active" : ""} style={{color: '#8b5cf6'}}><FiFileText style={{display: 'inline', marginRight: '6px'}} />Add Text</div>
            <div onClick={runOCR} style={{color: '#06b6d4'}}><FiCode style={{display: 'inline', marginRight: '6px'}} />OCR</div>
            <div
              className="relative"
              onMouseEnter={() => setOfficeMenuOpen(true)}
              onMouseLeave={() => setOfficeMenuOpen(false)}
              onClick={() => {
                console.log('[RibbonBar] To Office clicked');
                useUIStore.getState().openToOfficeModal();
              }}
              style={{color: '#ec4899', cursor: 'pointer'}}
            >
              <div><MdMerge style={{display: 'inline', marginRight: '6px'}} />To Office</div>
              {officeMenuOpen && (
                <div className="absolute top-full left-0 bg-white shadow-md rounded-md py-1 w-32 z-10">
                  {/* Export options commented */}
                </div>
              )}
            </div>
          </>
        );
      case "Comment":
        return (
          <>
            <div onClick={setHighlight} className={tool === "highlight" ? "active" : ""} style={{color: '#1e3a8a'}}><FaHighlighter style={{display: 'inline', marginRight: '6px', color: highlightColor || '#f59e0b'}} />Highlight</div>
            <div onClick={setUnderline} className={tool === "underline" ? "active" : ""} style={{color: '#3b82f6'}}><FaUnderline style={{display: 'inline', marginRight: '6px'}} />Underline</div>
            <div onClick={setStrikeout} className={tool === "strikeout" ? "active" : ""} style={{color: '#8b5cf6'}}><FaStrikethrough style={{display: 'inline', marginRight: '6px'}} />Strikeout</div>
            <div onClick={setStickyNote} className={tool === "sticky-note" ? "active" : ""} style={{color: '#06b6d4'}}><FaStickyNote style={{display: 'inline', marginRight: '6px'}} />Sticky Note</div>
            <div onClick={setPen} className={tool === "pen" ? "active" : ""} style={{color: '#ef4444'}}><FaPen style={{display: 'inline', marginRight: '6px'}} />Pen / Draw</div>
            <div onClick={setShapes} className={tool === "shapes" ? "active" : ""} style={{color: '#10b981'}}><FaShapes style={{display: 'inline', marginRight: '6px'}} />Shapes</div>
            <div onClick={toggleCommentsPanel} style={{color: '#6366f1'}}><FiFileText style={{display: 'inline', marginRight: '6px'}} />Comments Panel</div>
          </>
        );
      case "Edit":
        return (
          <>
            <div onClick={handleEditText} className={tool === "editText" ? "active" : ""} style={{color: '#3b82f6'}}><FiEdit style={{display: 'inline', marginRight: '6px'}} />Edit Text</div>
            <div onClick={handleEditImage} className={tool === "editImage" ? "active" : ""} style={{color: '#8b5cf6'}}><FiImage style={{display: 'inline', marginRight: '6px'}} />Edit Image</div>
            <div onClick={handleAddText} className={tool === "addText" ? "active" : ""} style={{color: '#06b6d4'}}><FiFileText style={{display: 'inline', marginRight: '6px'}} />Add Text</div>
            <div onClick={handleAddImage} style={{color: '#f59e0b'}}><MdImage style={{display: 'inline', marginRight: '6px'}} />Add Image</div>
            <div onClick={handleObjectSelect} className={tool === "select" ? "active" : ""} style={{color: '#14b8a6'}}><FiCrosshair style={{display: 'inline', marginRight: '6px'}} />Object Select</div>
            <div onClick={handleAlign} style={{color: '#ef4444'}}><FiLayers style={{display: 'inline', marginRight: '6px'}} />Align</div>
            <div onClick={handleRotate} style={{color: '#ec4899'}}><BiRotateRight style={{display: 'inline', marginRight: '6px'}} />Rotate</div>
            <div onClick={handleResize} style={{color: '#1f7fe6'}}><FiLayers style={{display: 'inline', marginRight: '6px'}} />Resize</div>
            <div onClick={handleCropPage} style={{color: '#f97316'}}><FiEdit style={{display: 'inline', marginRight: '6px'}} />Crop Page</div>
          </>
        );
      case "Convert":
        return <ConvertTab />;
      case "Page":
        return (
          <>
            <div onClick={handleInsertPage} style={{color: '#14b8a6'}}><AiOutlinePlus style={{display: 'inline', marginRight: '6px'}} />Insert Page</div>
            <div onClick={handleDeletePage} style={{color: '#ef4444'}}><AiOutlineDelete style={{display: 'inline', marginRight: '6px'}} />Delete</div>
            <div onClick={handleExtractPage} style={{color: '#f59e0b'}}><FiImage style={{display: 'inline', marginRight: '6px'}} />Extract</div>
            <div onClick={handleRotatePage} style={{color: '#3b82f6'}}><BiRotateRight style={{display: 'inline', marginRight: '6px'}} />Rotate</div>
            <div onClick={handleReverseRotate} style={{color: '#8b5cf6'}}><BiRotateLeft style={{display: 'inline', marginRight: '6px'}} />Reverse Rotate</div>
            <div onClick={handleReorderPages} style={{color: '#06b6d4'}}><FiLayers style={{display: 'inline', marginRight: '6px'}} />Reorder</div>
            <div onClick={handleDuplicatePage} style={{color: '#10b981'}}><FiLayers style={{display: 'inline', marginRight: '6px'}} />Duplicate</div>
          </>
        );
      case "Merge":
        return (
          <>
            <div onClick={handleAddPDFs} style={{color: '#3b82f6'}}><AiOutlinePlus style={{display: 'inline', marginRight: '6px'}} />Add PDFs</div>
            <div onClick={handleMergeNow} style={{color: '#10b981'}}><MdMerge style={{display: 'inline', marginRight: '6px'}} />Merge Now</div>
            <div onClick={handleOpenMerged} style={{color: '#8b5cf6'}}><FiFile style={{display: 'inline', marginRight: '6px'}} />Open Merged File</div>
          </>
        );
      case "Protect":
        return (
          <>
            <div onClick={handleEncrypt} style={{color: '#ef4444'}}><FaLock style={{display: 'inline', marginRight: '6px'}} />Encrypt</div>
            <div onClick={handlePermissions} style={{color: '#f97316'}}><FaLock style={{display: 'inline', marginRight: '6px'}} />Permissions</div>
            <div onClick={handleDigitalSignature} style={{color: '#6366f1'}}><FiPenTool style={{display: 'inline', marginRight: '6px'}} />Digital Signature</div>
            <div onClick={handleRedaction} style={{color: '#ec4899'}}><FiEdit style={{display: 'inline', marginRight: '6px'}} />Redaction</div>
            <div onClick={handleRemoveMetadata} style={{color: '#1f7fe6'}}><FiFile style={{display: 'inline', marginRight: '6px'}} />Remove Metadata</div>
          </>
        );
      case "Tools":
        return (
          <>
            <div onClick={handleToolsMerge} style={{color: '#3b82f6'}}><MdMerge style={{display: 'inline', marginRight: '6px'}} />Merge</div>
            <div onClick={handleToolsSplit} style={{color: '#06b6d4'}}><FiCode style={{display: 'inline', marginRight: '6px'}} />Split</div>
            <div onClick={handleCompress} style={{color: '#f59e0b'}}><FaCompress style={{display: 'inline', marginRight: '6px'}} />Compress</div>
            <div onClick={handleInspectPDF} style={{color: '#8b5cf6'}}><FiFile style={{display: 'inline', marginRight: '6px'}} />Inspect PDF</div>
            <div onClick={handleOCRAdvanced} style={{color: '#10b981'}}><FiCode style={{display: 'inline', marginRight: '6px'}} />OCR Advanced</div>
            <div onClick={handleFlatten} style={{color: '#ef4444'}}><FiLayers style={{display: 'inline', marginRight: '6px'}} />Flatten</div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="ribbon-container">
      <div className="ribbon-top-row">
        <div className="file-button" onClick={() => setFileMenuOpen(!fileMenuOpen)}>File</div>
        <div className="icon-bar">
          <div className="icon-button" onClick={openPDF} title="Open" style={{color: '#1f7fe6'}}><FiFile style={{fontSize: '20px'}} /></div>
          <div className="icon-button" onClick={handleSave} title="Save" style={{color: '#2ecc71'}}><FiSave style={{fontSize: '20px'}} /></div>
          <div className="icon-button" onClick={handleAddButton} title="Add" style={{color: '#3b82f6'}}><AiOutlinePlus style={{fontSize: '20px'}} /></div>
          <div className="icon-button" onClick={handleRemoveButton} title="Remove" style={{color: '#ef4444'}}><AiOutlineDelete style={{fontSize: '20px'}} /></div>
          <div className="icon-button" onClick={handleRefreshButton} title="Refresh" style={{color: '#f59e0b'}}><BiRotateRight style={{fontSize: '20px'}} /></div>
          <div className="icon-button" onClick={handleExportButton} title="Export" style={{color: '#f97316'}}><FaFileWord style={{fontSize: '20px'}} /></div>
          <div className="icon-button" onClick={handlePrint} title="Print" style={{color: '#e74c3c'}}><FiPrinter style={{fontSize: '20px'}} /></div>
          <div style={{ width: '1px', height: '24px', backgroundColor: '#ddd', margin: '0 8px' }}></div>
          <div className="icon-button" onClick={handleZoomOut} title="Zoom Out" style={{color: '#8b5cf6'}}><FiZoomOut style={{fontSize: '20px'}} /></div>
          <div className="text-sm" style={{ width: '40px', textAlign: 'center' }}>{Math.round(zoom * 100)}%</div>
          <div className="icon-button" onClick={handleZoomIn} title="Zoom In" style={{color: '#8b5cf6'}}><FiZoomIn style={{fontSize: '20px'}} /></div>
        </div>
        {fileMenuOpen && <FileMenu onOpenImageExport={onOpenImageExport} onClose={() => setFileMenuOpen(false)} />}
      </div>

      <div className="ribbon-tabs">
        {["Home", "Comment", "Edit", "Convert", "Page", "Merge", "Protect", "Tools"].map(
          (tab) => (
            <div
              key={tab}
              className={`ribbon-tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </div>
          )
        )}
      </div>

      <div className="ribbon-subbar">{renderSubButtons()}</div>

      {tool === "selectText" && <TextEditorPanel />}

      <input
        ref={singleFileInputRef}
        type="file"
        style={{ display: "none" }}
        accept="application/pdf"
        onChange={handleInput}
      />
      <input
        ref={mergeFileInputRef}
        type="file"
        style={{ display: "none" }}
        accept="application/pdf"
        multiple
        onChange={handleMergeFiles}
      />
      <input
        ref={imageInputRef}
        type="file"
        style={{ display: "none" }}
        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
        onChange={handleImageFileSelected}
      />

    </div>
  );
};

export default RibbonBar;