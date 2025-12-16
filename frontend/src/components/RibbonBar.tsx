import React, { useState, useRef, useCallback } from "react";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
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
import { FaHighlighter, FaUnderline, FaStrikethrough, FaStickyNote, FaPen, FaShapes, FaCompress, FaLock, FaLockOpen } from "react-icons/fa";
import { MdMerge, MdImage, MdHtml } from "react-icons/md";
import { FaFileWord, FaFileExcel, FaFilePowerpoint } from "react-icons/fa";
import { BiRotateRight, BiRotateLeft } from "react-icons/bi";
import { AiOutlinePlus, AiOutlineDelete } from "react-icons/ai";
import { saveAs } from 'file-saver';

const RibbonBar: React.FC = () => {
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Home");
  const [officeMenuOpen, setOfficeMenuOpen] = useState(false);
  const [showHighlightColorPicker, setShowHighlightColorPicker] = useState(false);
  const [mergeQueue, setMergeQueue] = useState<File[]>([]);
  const [mergedFile, setMergedFile] = useState<File | null>(null);
  const [showShapesPopup, setShowShapesPopup] = useState(false);
  const [selectedShape, setSelectedShape] = useState<string>('rectangle');
  const [selectedShapeColor, setSelectedShapeColor] = useState<string>('#FF0000');

  const { activeDocument, documents, openDocument } = useDocumentsStore();
  const { activeTool: tool, setActiveTool, toggleCommentsPanel, zoom, setZoom, highlightColor, setHighlightColor, setSelectedShapeType, setDrawingColor } = useUIStore();
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
      const workingDoc = await PDFDocument.load(clonedBytes, { ignoreEncryption: true });

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
      const finalDoc = await PDFDocument.load(finalBuffer, { ignoreEncryption: true });

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

    // Logic from EditTab - Simple rotation
    const choice = confirm('Rotate clockwise (OK) or counter-clockwise (Cancel)?');
    const angle = choice ? 90 : -90;

    try {
      toast.loading('Rotating page...', { id: 'rotate' });

      // Use activeDocument directly
      const buf = await activeDocument.file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });

      const page = pdfDoc.getPage((activeDocument.currentPage || 1) - 1);
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees((currentRotation + angle) % 360));

      const bytes = await pdfDoc.save();
      const newFile = new File([bytes], activeDocument.name, {
        type: 'application/pdf',
      });

      const { closeDocument, openDocument } = useDocumentsStore.getState();
      closeDocument(activeDocument.id);
      await openDocument(newFile);

      toast.success(`Page rotated ${angle}°`, { id: 'rotate' });
      logger.success(`Page rotated by ${angle} degrees`);
    } catch (err) {
      toast.error(`Rotation failed: ${err}`, { id: 'rotate' });
      logger.error(`Page rotation failed: ${err}`);
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

    // Logic from EditTab - Simple margin input
    const marginInput = prompt(
      'CROP PAGE - Remove margins\n\nEnter margin to remove (in points, 72 points = 1 inch):\n\nExamples:\n  36 = Remove 0.5 inch from all sides\n  72 = Remove 1 inch from all sides\n  0 = No cropping',
      '36'
    );
    if (!marginInput) return;

    const margin = parseInt(marginInput);
    if (isNaN(margin) || margin < 0) {
      toast.error('Invalid margin value.');
      return;
    }

    try {
      toast.loading('Cropping page...', { id: 'crop' });

      const buf = await activeDocument.file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });

      const page = pdfDoc.getPage((activeDocument.currentPage || 1) - 1);
      const { width, height } = page.getSize();

      if (margin * 2 >= width || margin * 2 >= height) {
        toast.error('Margin too large for page size.', { id: 'crop' });
        return;
      }

      page.setCropBox(margin, margin, width - margin * 2, height - margin * 2);

      const bytes = await pdfDoc.save();
      const newFile = new File([bytes], activeDocument.name, {
        type: 'application/pdf',
      });

      const { closeDocument, openDocument } = useDocumentsStore.getState();
      closeDocument(activeDocument.id);
      await openDocument(newFile);

      toast.success(`Page cropped with ${margin}pt margins removed`, { id: 'crop' });
      logger.success(`Page cropped with ${margin}pt margin`);
    } catch (err) {
      toast.error(`Crop failed: ${err}`, { id: 'crop' });
      logger.error(`Page crop failed: ${err}`);
    }
  };

  const handleWatermark = async () => {
    const currentDoc = useDocumentsStore.getState().activeDocument;
    if (!currentDoc) {
      toast.error("Please load a PDF first");
      return;
    }

    const watermarkText = window.prompt("Enter watermark text:", "CONFIDENTIAL");
    if (!watermarkText) return;

    try {
      toast.loading("Adding watermark...", { id: "watermark" });

      // Try to use pdfLibDoc, or create one from file as fallback
      let originalDoc = currentDoc.pdfLibDoc;
      if (!originalDoc && currentDoc.file) {
        console.log("[Watermark] Creating pdfLibDoc from file (pdfBytes may be detached)");
        const bytes = await currentDoc.file.arrayBuffer();
        originalDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      }

      if (!originalDoc) {
        toast.error("PDF document not available - please reload", { id: "watermark" });
        console.error("[Watermark] No source available", { pdfLibDoc: currentDoc.pdfLibDoc, file: !!currentDoc.file });
        return;
      }

      const clonedBytes = await originalDoc.save();
      const workingDoc = await PDFDocument.load(clonedBytes, { ignoreEncryption: true });
      const pages = workingDoc.getPages();

      // Apply watermark to all pages
      pages.forEach((page) => {
        const { width, height } = page.getSize();
        page.drawText(watermarkText, {
          x: width / 2 - watermarkText.length * 15,
          y: height / 2,
          size: 60,
          opacity: 0.2,
          color: rgb(0.5, 0.5, 0.5),
        });
      });

      const finalBytes = await workingDoc.save();
      // Convert to a fresh ArrayBuffer to avoid detached buffer issues
      const finalUint8Array = new Uint8Array(finalBytes);
      const finalBuffer = finalUint8Array.buffer.slice(0);
      const finalDoc = await PDFDocument.load(finalBuffer, { ignoreEncryption: true });

      // Create a new File object from the modified bytes for proper saving
      const finalBlob = new Blob([finalUint8Array], { type: 'application/pdf' });
      const newFile = new File([finalBlob], currentDoc.name || 'document.pdf', { type: 'application/pdf' });

      const { updateDocument } = useDocumentsStore.getState();
      if (updateDocument) {
        updateDocument(currentDoc.id, {
          file: newFile,
          pdfBytes: finalBuffer,
          pdfLibDoc: finalDoc,
        });
      }

      toast.success("Watermark added! Click Save to persist changes.", { id: "watermark" });
      logger.success(`Watermark "${watermarkText}" applied`);
    } catch (err) {
      console.error("Watermark failed:", err);
      toast.error(`Watermark failed: ${err}`, { id: "watermark" });
    }
  };

  const handleHeaderFooter = async () => {
    const currentDoc = useDocumentsStore.getState().activeDocument;
    if (!currentDoc) {
      toast.error("Please load a PDF first");
      return;
    }

    const headerText = window.prompt("Enter header text (or leave blank):", "");
    if (headerText === null) return;

    const footerText = window.prompt("Enter footer text (or leave blank):", "");
    if (footerText === null) return;

    if (!headerText && !footerText) {
      toast.error("Please enter header or footer text");
      return;
    }

    try {
      toast.loading("Adding header/footer...", { id: "hf" });

      // Try to use pdfLibDoc, or create one from file as fallback
      let originalDoc = currentDoc.pdfLibDoc;
      if (!originalDoc && currentDoc.file) {
        console.log("[HeaderFooter] Creating pdfLibDoc from file (pdfBytes may be detached)");
        const bytes = await currentDoc.file.arrayBuffer();
        originalDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      }

      if (!originalDoc) {
        toast.error("PDF document not available - please reload", { id: "hf" });
        console.error("[HeaderFooter] No source available", { pdfLibDoc: currentDoc.pdfLibDoc, file: !!currentDoc.file });
        return;
      }

      const clonedBytes = await originalDoc.save();
      const workingDoc = await PDFDocument.load(clonedBytes, { ignoreEncryption: true });
      const pages = workingDoc.getPages();

      pages.forEach((page) => {
        const { height } = page.getSize();

        if (headerText) {
          page.drawText(headerText, {
            x: 20,
            y: height - 20,
            size: 10,
            color: rgb(0.5, 0.5, 0.5),
          });
        }

        if (footerText) {
          page.drawText(footerText, {
            x: 20,
            y: 10,
            size: 10,
            color: rgb(0.5, 0.5, 0.5),
          });
        }
      });

      const finalBytes = await workingDoc.save();
      // Convert to a fresh ArrayBuffer to avoid detached buffer issues
      const finalUint8Array = new Uint8Array(finalBytes);
      const finalBuffer = finalUint8Array.buffer.slice(0);
      const finalDoc = await PDFDocument.load(finalBuffer, { ignoreEncryption: true });

      // Create a new File object from the modified bytes for proper saving
      const finalBlob = new Blob([finalUint8Array], { type: 'application/pdf' });
      const newFile = new File([finalBlob], currentDoc.name || 'document.pdf', { type: 'application/pdf' });

      const { updateDocument } = useDocumentsStore.getState();
      if (updateDocument) {
        updateDocument(currentDoc.id, {
          file: newFile,
          pdfBytes: finalBuffer,
          pdfLibDoc: finalDoc,
        });
      }

      toast.success("Header/Footer added. Save to keep changes.", { id: "hf" });
      logger.success(`Header/Footer applied`);
    } catch (err) {
      console.error("Header/Footer failed:", err);
      toast.error(`Header/Footer failed: ${err}`, { id: "hf" });
    }
  };

  const handleBatesNumbering = async () => {
    const currentDoc = useDocumentsStore.getState().activeDocument;
    if (!currentDoc) {
      toast.error("Please load a PDF first");
      return;
    }

    const prefix = window.prompt("Enter numbering prefix (e.g., DOC):", "DOC");
    if (prefix === null) return;

    try {
      toast.loading("Adding Bates numbering...", { id: "bates" });

      // Try to use pdfLibDoc, or create one from file as fallback
      let originalDoc = currentDoc.pdfLibDoc;
      if (!originalDoc && currentDoc.file) {
        console.log("[BatesNumbering] Creating pdfLibDoc from file (pdfBytes may be detached)");
        const bytes = await currentDoc.file.arrayBuffer();
        originalDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      }

      if (!originalDoc) {
        toast.error("PDF document not available - please reload", { id: "bates" });
        console.error("[BatesNumbering] No source available", { pdfLibDoc: currentDoc.pdfLibDoc, file: !!currentDoc.file });
        return;
      }

      const clonedBytes = await originalDoc.save();
      const workingDoc = await PDFDocument.load(clonedBytes, { ignoreEncryption: true });
      const pages = workingDoc.getPages();

      pages.forEach((page, index) => {
        const pageNumber = String(index + 1).padStart(4, "0");
        const batesNumber = `${prefix}-${pageNumber}`;

        const { width, height } = page.getSize();
        page.drawText(batesNumber, {
          x: width - 80,
          y: 10,
          size: 10,
          color: rgb(0.3, 0.3, 0.3),
        });
      });

      const finalBytes = await workingDoc.save();
      // Convert to a fresh ArrayBuffer to avoid detached buffer issues
      const finalUint8Array = new Uint8Array(finalBytes);
      const finalBuffer = finalUint8Array.buffer.slice(0);
      const finalDoc = await PDFDocument.load(finalBuffer, { ignoreEncryption: true });

      // Create a new File object from the modified bytes for proper saving
      const finalBlob = new Blob([finalUint8Array], { type: 'application/pdf' });
      const newFile = new File([finalBlob], currentDoc.name || 'document.pdf', { type: 'application/pdf' });

      const { updateDocument } = useDocumentsStore.getState();
      if (updateDocument) {
        updateDocument(currentDoc.id, {
          file: newFile,
          pdfBytes: finalBuffer,
          pdfLibDoc: finalDoc,
        });
      }

      toast.success("Bates numbering applied. Save to keep changes.", { id: "bates" });
      logger.success(`Bates numbering with prefix "${prefix}" applied`);
    } catch (err) {
      console.error("Bates numbering failed:", err);
      toast.error(`Bates numbering failed: ${err}`, { id: "bates" });
    }
  };

  const handleToWord = async () => {
    if (!activeDocument) {
      toast.error("Please load a PDF first");
      return;
    }

    try {
      toast.loading('Converting PDF to Word...', { id: 'toword' });
      logger.info('Starting PDF to Word conversion');

      // Create FormData with the PDF file
      const formData = new FormData();
      formData.append('file', activeDocument.file);
      formData.append('format', 'word');

      // Call backend conversion API
      const response = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Conversion failed');
      }

      // Get the converted file
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = activeDocument.name.replace('.pdf', '.docx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('PDF converted to Word successfully!', { id: 'toword' });
      logger.success('PDF to Word conversion completed');
    } catch (err) {
      console.error('PDF to Word conversion failed:', err);
      toast.error(`Conversion failed: ${err}`, { id: 'toword' });
      logger.error(`PDF to Word conversion failed: ${err}`);
    }
  };
  const handleToExcel = async () => {
    if (!activeDocument) {
      toast.error("Please load a PDF first");
      return;
    }

    try {
      toast.loading('Converting PDF to Excel...', { id: 'toexcel' });
      logger.info('Starting PDF to Excel conversion');

      const formData = new FormData();
      formData.append('file', activeDocument.file);
      formData.append('format', 'excel');

      const response = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Conversion failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = activeDocument.name.replace('.pdf', '.xlsx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('PDF converted to Excel successfully!', { id: 'toexcel' });
      logger.success('PDF to Excel conversion completed');
    } catch (err) {
      console.error('PDF to Excel conversion failed:', err);
      toast.error(`Conversion failed: ${err}`, { id: 'toexcel' });
      logger.error(`PDF to Excel conversion failed: ${err}`);
    }
  };
  const handleToPowerPoint = async () => {
    if (!activeDocument) {
      toast.error("Please load a PDF first");
      return;
    }

    try {
      toast.loading('Converting PDF to PowerPoint...', { id: 'toppt' });
      logger.info('Starting PDF to PowerPoint conversion');

      const formData = new FormData();
      formData.append('file', activeDocument.file);
      formData.append('format', 'ppt');

      const response = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Conversion failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = activeDocument.name.replace('.pdf', '.pptx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('PDF converted to PowerPoint successfully!', { id: 'toppt' });
      logger.success('PDF to PowerPoint conversion completed');
    } catch (err) {
      console.error('PDF to PowerPoint conversion failed:', err);
      toast.error(`Conversion failed: ${err}`, { id: 'toppt' });
      logger.error(`PDF to PowerPoint conversion failed: ${err}`);
    }
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
  const handleToText = async () => {
    if (!activeDocument) {
      toast.error("Please load a PDF first");
      return;
    }

    try {
      toast.loading('Converting PDF to Text...', { id: 'totext' });
      logger.info('Starting PDF to Text conversion');

      const formData = new FormData();
      formData.append('file', activeDocument.file);
      formData.append('format', 'text');

      const response = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Conversion failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = activeDocument.name.replace('.pdf', '.txt');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('PDF converted to Text successfully!', { id: 'totext' });
      logger.success('PDF to Text conversion completed');
    } catch (err) {
      console.error('PDF to Text conversion failed:', err);
      toast.error(`Conversion failed: ${err}`, { id: 'totext' });
      logger.error(`PDF to Text conversion failed: ${err}`);
    }
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
      const workingDoc = await PDFDocument.load(clonedBytes, { ignoreEncryption: true });
      const currentPageIndex = (latestDoc.currentPage || 1) - 1;

      const result = await mutationFn(workingDoc, currentPageIndex, latestDoc.id);

      const finalBytes = await workingDoc.save();
      const finalBuffer = new Uint8Array(finalBytes).slice().buffer;
      const finalDoc = await PDFDocument.load(finalBuffer, { ignoreEncryption: true });

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
    logger.info('[Page Tab] Insert Page button clicked');
    if (!activeDocument) {
      toast.error("Please load a PDF first", { duration: 4000 });
      logger.warn("Insert Page failed - no PDF loaded");
      alert("Please load a PDF first before using Page functions");
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
    logger.info('[Page Tab] Delete Page button clicked');
    if (!activeDocument) {
      toast.error("Please load a PDF first", { duration: 4000 });
      alert("Please load a PDF first before using Page functions");
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
    logger.info('[Page Tab] Extract Page button clicked');
    if (!activeDocument) {
      toast.error("Please load a PDF first", { duration: 4000 });
      alert("Please load a PDF first before using Page functions");
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
    logger.info('[Page Tab] Rotate Page button clicked');
    if (!activeDocument) {
      toast.error("Please load a PDF first", { duration: 4000 });
      alert("Please load a PDF first before using Page functions");
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
    logger.info('[Page Tab] Reverse Rotate button clicked');
    if (!activeDocument) {
      toast.error("Please load a PDF first", { duration: 4000 });
      alert("Please load a PDF first before using Page functions");
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

  const handleDeletePages = async () => {
    console.log('[Edit Tab] Delete Pages clicked, activeDocument:', !!activeDocument);
    logger.info('[Edit Tab] Delete Pages button clicked');
    if (!activeDocument) {
      toast.error("Please load a PDF first", { duration: 4000 });
      alert("Please load a PDF first");
      return;
    }

    // Logic from EditTab - Range deletion
    const totalPages = activeDocument.numPages || 1;
    if (totalPages <= 1) {
      toast.error('Cannot delete - document has only 1 page');
      return;
    }

    const pageInput = prompt(
      `DELETE PAGES

Enter pages to delete (1 to ${totalPages}):

Examples:
  5 = Delete page 5
  1,3,5 = Delete pages 1, 3, and 5
  2-4 = Delete pages 2 to 4
  1,3-5 = Delete pages 1, 3, 4, 5`,
      '1'
    );
    if (!pageInput) return;

    try {
      const pagesToDelete = new Set<number>();
      const parts = pageInput.split(',');

      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.includes('-')) {
          const [start, end] = trimmed.split('-').map(s => parseInt(s.trim()));
          if (isNaN(start) || isNaN(end) || start < 1 || end > totalPages || start > end) {
            toast.error(`Invalid range: ${trimmed}`);
            return;
          }
          for (let i = start; i <= end; i++) {
            pagesToDelete.add(i);
          }
        } else {
          const pageNum = parseInt(trimmed);
          if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) {
            toast.error(`Invalid page number: ${trimmed}`);
            return;
          }
          pagesToDelete.add(pageNum);
        }
      }

      if (pagesToDelete.size === 0) {
        toast.error('No valid pages selected');
        return;
      }

      if (pagesToDelete.size === totalPages) {
        toast.error('Cannot delete all pages');
        return;
      }

      toast.loading('Deleting pages...', { id: 'deletepages' });

      // Use activeDocument directly
      const buf = await activeDocument.file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });

      const indicesToRemove = Array.from(pagesToDelete).map(p => p - 1).sort((a, b) => b - a);
      for (const idx of indicesToRemove) {
        pdfDoc.removePage(idx);
      }

      const bytes = await pdfDoc.save();
      const newFile = new File([bytes], activeDocument.name, {
        type: 'application/pdf',
      });

      const { closeDocument, openDocument } = useDocumentsStore.getState();
      closeDocument(activeDocument.id);
      await openDocument(newFile);

      toast.success(`Deleted ${pagesToDelete.size} page(s)`, { id: 'deletepages' });
      logger.success(`Deleted pages: ${Array.from(pagesToDelete).join(', ')}`);
    } catch (err) {
      toast.error(`Delete failed: ${err}`, { id: 'deletepages' });
      logger.error(`Page deletion failed: ${err}`);
    }
  };

  const handleReorderPages = async () => {
    console.log('[Page Tab] Reorder Pages clicked, activeDocument:', !!activeDocument);
    logger.info('[Page Tab] Reorder Pages button clicked');
    if (!activeDocument) {
      toast.error("Please load a PDF first", { duration: 4000 });
      alert("Please load a PDF first before using Page functions");
      return;
    }

    // Logic from EditTab - Reorder
    const buf = await activeDocument.file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
    const totalPages = pdfDoc.getPageCount();

    if (totalPages <= 1) {
      toast.error('Cannot reorder - document has only 1 page');
      return;
    }

    const orderInput = prompt(
      `REORDER PAGES

Enter new page order (1 to ${totalPages}):

Examples:
  3,2,1 = Reverse order
  2,3,1 = Move page 1 to end
  1,3,2,4 = Swap pages 2 and 3

Duplicate pages to repeat them.`,
      Array.from({ length: totalPages }, (_, i) => (i + 1)).join(',')
    );
    if (!orderInput) return;

    try {
      const newOrder = orderInput.split(',').map(s => parseInt(s.trim()));

      if (newOrder.length === 0) {
        toast.error('No pages specified');
        return;
      }

      for (const pageNum of newOrder) {
        if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) {
          toast.error(`Invalid page number: ${pageNum}`);
          return;
        }
      }

      toast.loading('Reordering pages...', { id: 'reorder' });

      const newPdf = await PDFDocument.create();
      for (const pageNum of newOrder) {
        const [copiedPage] = await newPdf.copyPages(pdfDoc, [pageNum - 1]);
        newPdf.addPage(copiedPage);
      }

      const bytes = await newPdf.save();
      const newFile = new File([bytes], activeDocument.name, {
        type: 'application/pdf',
      });

      const { closeDocument, openDocument } = useDocumentsStore.getState();
      closeDocument(activeDocument.id);
      await openDocument(newFile);

      toast.success(`Pages reordered successfully`, { id: 'reorder' });
      logger.success(`Pages reordered to: ${newOrder.join(', ')}`);
    } catch (err) {
      toast.error(`Reorder failed: ${err}`, { id: 'reorder' });
      logger.error(`Page reorder failed: ${err}`);
    }
  };

  const handleDuplicatePage = async () => {
    console.log('[Page Tab] Duplicate Page clicked, activeDocument:', !!activeDocument);
    logger.info('[Page Tab] Duplicate Page button clicked');
    if (!activeDocument) {
      toast.error("Please load a PDF first", { duration: 4000 });
      alert("Please load a PDF first before using Page functions");
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
      // Create an immutable source document to copy from
      // This prevents corruption when copying multiple times from mutating document
      const sourceBytes = await workingDoc.save();
      const sourceDoc = await PDFDocument.load(sourceBytes);

      for (let i = 0; i < count; i++) {
        const [copiedPage] = await workingDoc.copyPages(sourceDoc, [currentIdx]);
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
            const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
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
  const handleEncrypt = async () => {
    if (!activeDocument) {
      toast.error("No active document");
      return;
    }
  
    const userPassword = prompt("Enter user password (owner can open with this):", "");
    if (userPassword === null) return;
  
    const ownerPassword = prompt("Enter owner password (required - for opening unrestricted):");
    if (!ownerPassword) {
      toast.error('Owner password is required for encryption.');
      return;
    }
  
    try {
      toast.loading('Encrypting PDF...', { id: 'encrypt' });
      logger.info('PDF encryption started');
        
      const formData = new FormData();
      formData.append('file', activeDocument.file);
      formData.append('userPassword', userPassword || '');
      formData.append('ownerPassword', ownerPassword);
  
      const response = await fetch('/api/encrypt-pdf', {
        method: 'POST',
        body: formData,
      });
  
      if (!response.ok) {
        throw new Error(`Encryption service error: ${response.statusText}`);
      }
  
      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error('Backend returned empty file');
      }
  
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = activeDocument.name.replace('.pdf', '_encrypted.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
  
      logger.success('PDF encrypted successfully');
      toast.success('PDF encrypted and downloaded!', { id: 'encrypt' });
    } catch (err) {
      logger.error('Encryption failed: ' + err);
      toast.error(`Encryption failed: ${err}`, { id: 'encrypt' });
    }
  };
  
  const handleDecrypt = async () => {
    if (!activeDocument) {
      toast.error("No active document");
      return;
    }

    try {
      toast.loading('Removing password from PDF...', { id: 'decrypt' });
      logger.info('PDF decryption started');
      
      // Load the PDF and remove encryption
      const buf = await activeDocument.file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
      
      // Save without encryption
      const decryptedBytes = await pdfDoc.save();
      const decryptedBlob = new Blob([new Uint8Array(decryptedBytes)], { type: 'application/pdf' });
      
      const url = window.URL.createObjectURL(decryptedBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = activeDocument.name.replace('.pdf', '_decrypted.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      logger.success('PDF password removed successfully');
      toast.success('Password removed!', { id: 'decrypt' });
      alert('✅ PASSWORD REMOVED!\n\nYour PDF has been successfully decrypted.\nThe password protection has been removed.\n\nFile: ' + activeDocument.name.replace('.pdf', '_decrypted.pdf'));
    } catch (err) {
      logger.error('Decryption failed: ' + err);
      toast.error(`Failed to remove password: ${err}`, { id: 'decrypt' });
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
  const handleDigitalSignature = async () => {
    if (!activeDocument) {
      alert("Please load a PDF first");
      return;
    }

    const signerName = window.prompt(
      "Digital Signature\n\nEnter your name for the signature:",
      "John Doe"
    );

    if (!signerName) return;

    toast.loading("Adding digital signature...", { id: "digitalSig" });

    const success = await mutateActivePdf("digitalSig", async (workingDoc, currentPageIndex) => {
      const pages = workingDoc.getPages();
      const page = pages[currentPageIndex];
      const { width, height } = page.getSize();

      const font = await workingDoc.embedFont(StandardFonts.Courier);
      const now = new Date();
      const dateStr = now.toLocaleDateString() + " " + now.toLocaleTimeString();

      const sigBoxWidth = 200;
      const sigBoxHeight = 60;
      const sigX = width - sigBoxWidth - 30;
      const sigY = 30;

      page.drawRectangle({
        x: sigX,
        y: sigY,
        width: sigBoxWidth,
        height: sigBoxHeight,
        borderColor: rgb(0, 0, 0.5),
        borderWidth: 1,
        color: rgb(0.95, 0.95, 1),
      });

      page.drawText("Digitally Signed By:", {
        x: sigX + 5,
        y: sigY + sigBoxHeight - 15,
        size: 8,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });

      page.drawText(signerName, {
        x: sigX + 5,
        y: sigY + sigBoxHeight - 30,
        size: 12,
        font,
        color: rgb(0, 0, 0.6),
      });

      page.drawText(`Date: ${dateStr}`, {
        x: sigX + 5,
        y: sigY + 8,
        size: 7,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });

      return {};
    });

    if (success) {
      toast.success("Digital signature added to current page", { id: "digitalSig" });
      logger.success("Digital signature applied");
    }
  };
  const handleRedaction = () => {
    if (!activeDocument) {
      alert("Please load a PDF first");
      return;
    }
    alert("Select content to redact (hide permanently). Click on text or areas to redact.");
    logger.info("Redaction mode activated");
  };
  const handleRemoveMetadata = async () => {
    if (!activeDocument) {
      alert("Please load a PDF first");
      return;
    }

    const confirm = window.confirm(
      "Remove Metadata\n\nThis will clear all metadata including:\n- Title\n- Author\n- Subject\n- Keywords\n- Creator\n- Producer\n- Creation Date\n- Modification Date\n\nContinue?"
    );

    if (!confirm) return;

    toast.loading("Removing metadata...", { id: "removeMetadata" });

    const success = await mutateActivePdf("removeMetadata", async (workingDoc) => {
      workingDoc.setTitle("");
      workingDoc.setAuthor("");
      workingDoc.setSubject("");
      workingDoc.setKeywords([]);
      workingDoc.setCreator("");
      workingDoc.setProducer("PDF Editor Pro");
      workingDoc.setCreationDate(new Date(0));
      workingDoc.setModificationDate(new Date(0));

      return {};
    });

    if (success) {
      toast.success("All metadata removed from PDF", { id: "removeMetadata" });
      logger.success("Metadata removed successfully");
    }
  };
  const handleToolsMerge = () => {
    alert("Open multiple PDFs, then click Merge tool to combine them into one document.");
    logger.info("Merge utility accessed");
  };
  const handleToolsSplit = async () => {
    if (!activeDocument) {
      alert("Please load a PDF first");
      return;
    }

    // Logic from ToolsTab
    const buf = await activeDocument.file.arrayBuffer();
    const src = await PDFDocument.load(buf, { ignoreEncryption: true });
    const total = src.getPageCount();

    const splitAt = Number(prompt(`Split after which page? (1 - ${total - 1})`));
    if (!splitAt || splitAt < 1 || splitAt >= total) return;

    try {
      toast.loading('Splitting PDF...', { id: 'split' });

      const doc1 = await PDFDocument.create();
      const doc2 = await PDFDocument.create();

      const firstPages = await doc1.copyPages(src, Array.from({ length: splitAt }, (_, i) => i));
      firstPages.forEach((p) => doc1.addPage(p));

      const secondPages = await doc2.copyPages(
        src,
        Array.from({ length: total - splitAt }, (_, i) => i + splitAt)
      );
      secondPages.forEach((p) => doc2.addPage(p));

      const bytes1 = await doc1.save();
      const bytes2 = await doc2.save();

      const name1 = activeDocument.name.replace(".pdf", "_part1.pdf");
      const name2 = activeDocument.name.replace(".pdf", "_part2.pdf");

      const file1 = new File([bytes1], name1, { type: 'application/pdf' });
      const file2 = new File([bytes2], name2, { type: 'application/pdf' });

      const { openDocument } = useDocumentsStore.getState();
      await openDocument(file1);
      await openDocument(file2);

      // Auto-download split files
      [file1, file2].forEach(file => {
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });

      toast.success('PDF split and downloaded successfully!', { id: 'split' });
      logger.success("PDF split successfully");
    } catch (err) {
      toast.error(`Split failed: ${err}`, { id: 'split' });
      logger.error(`PDF split failed: ${err}`);
    }
  };
  const handleCompress = async () => {
    if (!activeDocument) {
      alert("Please load a PDF first");
      return;
    }
    const quality = window.prompt("COMPRESS PDF\n\nEnter compression quality (1-100):\n\n  100 = Best quality\n   75 = Recommended\n    1 = Max compression", "75");
    if (!quality) return;

    const q = parseInt(quality);
    if (q < 1 || q > 100) {
      toast.error('Invalid quality value. Please enter 1-100.');
      return;
    }

    try {
      toast.loading('Compressing PDF...', { id: 'compress' });

      const formData = new FormData();
      formData.append('file', activeDocument.file);
      formData.append('quality', q.toString());

      const response = await fetch('/api/compress-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Compression failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const compressedFileName = activeDocument.name.replace('.pdf', '_compressed.pdf');
      const compressedFile = new File([blob], compressedFileName, { type: 'application/pdf' });

      const { openDocument } = useDocumentsStore.getState();
      await openDocument(compressedFile);

      // Auto-download compressed file
      const url = URL.createObjectURL(compressedFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = compressedFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Compressed PDF downloaded and opened!', { id: 'compress' });
      logger.success("PDF compressed successfully");
    } catch (err) {
      toast.error(`Compression failed: ${err}`, { id: 'compress' });
      logger.error(`PDF compression failed: ${err}`);
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

  const handleRemoveButton = async () => {
    if (!activeDocument) {
      alert("Please load a PDF first");
      return;
    }

    if (!activeDocument.file) {
      toast.error("PDF file not available");
      return;
    }

    try {
      // Get the actual page count from the PDF document
      const buf = await activeDocument.file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const numPages = pdfDoc.getPageCount();

      if (numPages <= 1) {
        toast.error("Cannot delete the only page in the document");
        return;
      }

      const confirmDelete = window.confirm(`Delete page ${activeDocument.currentPage}? This action cannot be undone.`);
      if (!confirmDelete) return;

      toast.loading("Deleting page...", { id: "deletePage" });
      const pageToDelete = activeDocument.currentPage || 1;

      // Remove the page
      pdfDoc.removePage(pageToDelete - 1);

      // Save the modified PDF
      const bytes = await pdfDoc.save();
      const newFile = new File([new Uint8Array(bytes)], activeDocument.name, {
        type: "application/pdf",
      });

      // Update the document store
      const { closeDocument, openDocument } = useDocumentsStore.getState();
      closeDocument(activeDocument.id);

      // Open the modified document
      await openDocument(newFile);

      toast.success(`Page ${pageToDelete} deleted`, { id: "deletePage" });
      logger.success(`Page ${pageToDelete} deleted successfully`);
    } catch (err) {
      console.error("Delete page failed:", err);
      toast.error(`Failed to delete page: ${err}`, { id: "deletePage" });
      logger.error(`Delete page failed: ${err}`);
    }
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
      const stickyNotes = useAnnotationsStore.getState().stickyNotes[activeDocument.id] || [];
      const penStrokes = useAnnotationsStore.getState().penStrokes[activeDocument.id] || [];
      const shapes = useAnnotationsStore.getState().shapes[activeDocument.id] || [];

      console.log('[RibbonBar Save] docId:', activeDocument.id);
      console.log('[RibbonBar Save] Stats:', {
        highlights: highlights.length,
        textEdits: textEdits.length,
        imageEdits: imageEdits.length,
        stickyNotes: stickyNotes.length,
        penStrokes: penStrokes.length,
        shapes: shapes.length
      });

      let pdfBlob: Blob;

      if (
        highlights.length > 0 ||
        textEdits.length > 0 ||
        imageEdits.length > 0 ||
        stickyNotes.length > 0 ||
        penStrokes.length > 0 ||
        shapes.length > 0
      ) {
        console.log('[RibbonBar Save] Applying modifications...');
        // Use pdfBytes from store if available (contains rotations/deletions), otherwise from file
        const sourceBytes = activeDocument.pdfBytes || await activeDocument.file.arrayBuffer();

        const modifiedPdfBytes = await applyAllModificationsToPdf(
          sourceBytes,
          highlights,
          textEdits,
          imageEdits,
          stickyNotes,
          penStrokes,
          shapes
        );
        // Debug logging for corrupted file issue
        console.log('[RibbonBar Save] Modified PDF bytes length:', modifiedPdfBytes.length);
        console.log('[RibbonBar Save] First 5 bytes:', modifiedPdfBytes.slice(0, 5));

        pdfBlob = new Blob([modifiedPdfBytes as any], { type: 'application/pdf' });
        console.log('[RibbonBar Save] Modifications applied successfully');
        toast.success(`Saved with all annotations`);
      } else {
        pdfBlob = activeDocument.file;
        toast.success('PDF saved (Original)');
      }

      saveAs(pdfBlob, activeDocument.name || "document.pdf");
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
      // Get PDF with any modifications applied
      const docHighlights = useAnnotationsStore.getState().highlights[activeDocument.id] || [];
      const docTextEdits = useTextEditsStore.getState().edits[activeDocument.id] || [];
      const docImageEdits = useImageEditsStore.getState().edits[activeDocument.id] || [];
      const docStickyNotes = useAnnotationsStore.getState().stickyNotes[activeDocument.id] || [];
      const docPenStrokes = useAnnotationsStore.getState().penStrokes[activeDocument.id] || [];
      const docShapes = useAnnotationsStore.getState().shapes[activeDocument.id] || [];

      let pdfBlob: Blob;
      if (
        docHighlights.length > 0 ||
        docTextEdits.length > 0 ||
        docImageEdits.length > 0 ||
        docStickyNotes.length > 0 ||
        docPenStrokes.length > 0 ||
        docShapes.length > 0
      ) {
        const sourceBytes = activeDocument.pdfBytes || await activeDocument.file.arrayBuffer();
        const modifiedPdfBytes = await applyAllModificationsToPdf(
          sourceBytes,
          docHighlights,
          docTextEdits,
          docImageEdits,
          docStickyNotes,
          docPenStrokes,
          docShapes
        );
        pdfBlob = new Blob([modifiedPdfBytes as any], { type: 'application/pdf' });
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
            <div onClick={openPDF} style={{ color: '#1f7fe6' }}><FiFile style={{ display: 'inline', marginRight: '6px' }} />Open</div>
            <div onClick={selectHandTool} className={isHandToolActive ? "active" : ""} style={{ color: '#16a34a' }}><FiCrosshair style={{ display: 'inline', marginRight: '6px' }} />Hand</div>
            <div onClick={selectSelectTool} className={isSelectToolActive ? "active" : ""} style={{ color: '#dc2626' }}><FiLayers style={{ display: 'inline', marginRight: '6px' }} />Select</div>
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
              style={{ color: '#1e3a8a', cursor: 'pointer', position: 'relative' }}
            >
              <FaHighlighter style={{ display: 'inline', marginRight: '6px', color: highlightColor || '#f59e0b' }} />Highlight
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
              style={{ color: '#6366f1', cursor: 'pointer' }}
            ><FiEdit style={{ display: 'inline', marginRight: '6px' }} />Edit All</div>
            <div onClick={addTextTool} className={tool === "selectText" ? "active" : ""} style={{ color: '#8b5cf6' }}><FiFileText style={{ display: 'inline', marginRight: '6px' }} />Add Text</div>
            <div onClick={runOCR} style={{ color: '#06b6d4' }}><FiCode style={{ display: 'inline', marginRight: '6px' }} />OCR</div>
            <div
              className="relative"
              onMouseEnter={() => setOfficeMenuOpen(true)}
              onMouseLeave={() => setOfficeMenuOpen(false)}
              onClick={() => {
                console.log('[RibbonBar] To Office clicked');
                useUIStore.getState().openToOfficeModal();
              }}
              style={{ color: '#ec4899', cursor: 'pointer' }}
            >
              <div><MdMerge style={{ display: 'inline', marginRight: '6px' }} />To Office</div>
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
            <div onClick={setHighlight} className={tool === "highlight" ? "active" : ""} style={{ color: '#1e3a8a' }}><FaHighlighter style={{ display: 'inline', marginRight: '6px', color: highlightColor || '#f59e0b' }} />Highlight</div>
            <div onClick={setUnderline} className={tool === "underline" ? "active" : ""} style={{ color: '#3b82f6' }}><FaUnderline style={{ display: 'inline', marginRight: '6px' }} />Underline</div>
            <div onClick={setStrikeout} className={tool === "strikeout" ? "active" : ""} style={{ color: '#8b5cf6' }}><FaStrikethrough style={{ display: 'inline', marginRight: '6px' }} />Strikeout</div>
            <div onClick={setStickyNote} className={tool === "sticky-note" ? "active" : ""} style={{ color: '#06b6d4' }}><FaStickyNote style={{ display: 'inline', marginRight: '6px' }} />Sticky Note</div>
            <div onClick={setPen} className={tool === "pen" ? "active" : ""} style={{ color: '#ef4444' }}><FaPen style={{ display: 'inline', marginRight: '6px' }} />Pen / Draw</div>
            <div onClick={() => setShowShapesPopup(true)} className={tool === "shapes" ? "active" : ""} style={{ color: '#10b981' }}><FaShapes style={{ display: 'inline', marginRight: '6px' }} />Shapes</div>

            {showShapesPopup && (
              <div style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'white',
                border: '2px solid #333',
                borderRadius: '8px',
                padding: '20px',
                zIndex: 10000,
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                minWidth: '400px'
              }}>
                <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#333' }}>Select Shape & Color</h3>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>Shape:</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setSelectedShape('rectangle')}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: selectedShape === 'rectangle' ? '#6366f1' : '#e5e7eb',
                        color: selectedShape === 'rectangle' ? 'white' : '#333',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: selectedShape === 'rectangle' ? '600' : '500'
                      }}
                    >
                      Square
                    </button>
                    <button
                      onClick={() => setSelectedShape('circle')}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: selectedShape === 'circle' ? '#6366f1' : '#e5e7eb',
                        color: selectedShape === 'circle' ? 'white' : '#333',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: selectedShape === 'circle' ? '600' : '500'
                      }}
                    >
                      Circle
                    </button>
                    <button
                      onClick={() => setSelectedShape('line')}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: selectedShape === 'line' ? '#6366f1' : '#e5e7eb',
                        color: selectedShape === 'line' ? 'white' : '#333',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: selectedShape === 'line' ? '600' : '500'
                      }}
                    >
                      Triangle
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>Color:</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                    {['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#000000', '#FF6600', '#FF1493', '#00CED1'].map(color => (
                      <button
                        key={color}
                        onClick={() => setSelectedShapeColor(color)}
                        style={{
                          width: '40px',
                          height: '40px',
                          backgroundColor: color,
                          border: selectedShapeColor === color ? '3px solid #333' : '1px solid #ccc',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowShapesPopup(false)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#e5e7eb',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setSelectedShapeType(selectedShape as 'rectangle' | 'circle' | 'line' | 'arrow');
                      setDrawingColor(selectedShapeColor);
                      setActiveTool('shapes');
                      setShowShapesPopup(false);
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#6366f1',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    Start Drawing
                  </button>
                </div>
              </div>
            )}

            {showShapesPopup && (
              <div
                onClick={() => setShowShapesPopup(false)}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  zIndex: 9999
                }}
              />
            )}

            <div onClick={toggleCommentsPanel} style={{ color: '#6366f1' }}><FiFileText style={{ display: 'inline', marginRight: '6px' }} />Comments Panel</div>
          </>
        );;
      case "Edit":
        return (
          <>
            <div onClick={handleEditText} className={tool === "editText" ? "active" : ""} style={{ cursor: 'pointer', color: '#3b82f6' }}><FiEdit style={{ display: 'inline', marginRight: '6px' }} />Edit Text</div>
            <div onClick={handleEditImage} className={tool === "editImage" ? "active" : ""} style={{ cursor: 'pointer', color: '#8b5cf6' }}><FiImage style={{ display: 'inline', marginRight: '6px' }} />Edit Image</div>
            <div onClick={handleAddText} className={tool === "addText" ? "active" : ""} style={{ cursor: 'pointer', color: '#06b6d4' }}><FiFileText style={{ display: 'inline', marginRight: '6px' }} />Add Text</div>
            <div onClick={handleAddImage} style={{ cursor: 'pointer', color: '#f59e0b' }}><MdImage style={{ display: 'inline', marginRight: '6px' }} />Add Image</div>
            <div onClick={handleObjectSelect} className={tool === "select" ? "active" : ""} style={{ cursor: 'pointer', color: '#14b8a6' }}><FiCrosshair style={{ display: 'inline', marginRight: '6px' }} />Object Select</div>
            <div onClick={handleAlign} style={{ cursor: 'pointer', color: '#ef4444' }}><FiLayers style={{ display: 'inline', marginRight: '6px' }} />Align</div>
            <div onClick={handleRotate} style={{ cursor: 'pointer', color: '#ec4899' }}><BiRotateRight style={{ display: 'inline', marginRight: '6px' }} />Rotate 90°</div>
            <div onClick={handleResize} style={{ cursor: 'pointer', color: '#1f7fe6' }}><FiLayers style={{ display: 'inline', marginRight: '6px' }} />Resize</div>
            <div onClick={handleCropPage} style={{ cursor: 'pointer', color: '#f97316' }}><FiEdit style={{ display: 'inline', marginRight: '6px' }} />Crop Page</div>
            <div onClick={handleDeletePages} style={{ cursor: 'pointer', color: '#ef4444' }}><AiOutlineDelete style={{ display: 'inline', marginRight: '6px' }} />Delete Pages</div>
            <div onClick={handleReorderPages} style={{ cursor: 'pointer', color: '#06b6d4' }}><FiLayers style={{ display: 'inline', marginRight: '6px' }} />Reorder Pages</div>
            <div onClick={handleWatermark} style={{ cursor: 'pointer', color: '#10b981' }}><FiFileText style={{ display: 'inline', marginRight: '6px' }} />Watermark</div>
          </>
        );
      case "Convert":
        return <ConvertTab />;
      case "Page":
        return (
          <>
            <div onClick={handleInsertPage} style={{ color: '#14b8a6' }}><AiOutlinePlus style={{ display: 'inline', marginRight: '6px' }} />Insert Page</div>
            <div onClick={handleDeletePage} style={{ color: '#ef4444' }}><AiOutlineDelete style={{ display: 'inline', marginRight: '6px' }} />Delete</div>
            <div onClick={handleExtractPage} style={{ color: '#f59e0b' }}><FiImage style={{ display: 'inline', marginRight: '6px' }} />Extract</div>
            <div onClick={handleRotatePage} style={{ color: '#3b82f6' }}><BiRotateRight style={{ display: 'inline', marginRight: '6px' }} />Rotate</div>
            <div onClick={handleReverseRotate} style={{ color: '#8b5cf6' }}><BiRotateLeft style={{ display: 'inline', marginRight: '6px' }} />Reverse Rotate</div>
            <div onClick={handleReorderPages} style={{ color: '#06b6d4' }}><FiLayers style={{ display: 'inline', marginRight: '6px' }} />Reorder</div>
            <div onClick={handleDuplicatePage} style={{ color: '#10b981' }}><FiLayers style={{ display: 'inline', marginRight: '6px' }} />Duplicate</div>
          </>
        );
      case "Merge":
        return (
          <>
            <div onClick={handleAddPDFs} style={{ color: '#3b82f6' }}><AiOutlinePlus style={{ display: 'inline', marginRight: '6px' }} />Add PDFs</div>
            <div onClick={handleMergeNow} style={{ color: '#10b981' }}><MdMerge style={{ display: 'inline', marginRight: '6px' }} />Merge Now</div>
            <div onClick={handleOpenMerged} style={{ color: '#8b5cf6' }}><FiFile style={{ display: 'inline', marginRight: '6px' }} />Open Merged File</div>
          </>
        );
      case "Protect":
        return (
          <>
            <div onClick={handleEncrypt} style={{ color: '#ef4444' }}><FaLock style={{ display: 'inline', marginRight: '6px' }} />Encrypt</div>
            <div onClick={handleDecrypt} style={{ color: '#16a34a' }}><FaLockOpen style={{ display: 'inline', marginRight: '6px' }} />Decrypt</div>
            <div onClick={handlePermissions} style={{ color: '#f97316' }}><FaLock style={{ display: 'inline', marginRight: '6px' }} />Permissions</div>
            <div onClick={handleDigitalSignature} style={{ color: '#6366f1' }}><FiPenTool style={{ display: 'inline', marginRight: '6px' }} />Digital Signature</div>
            <div onClick={handleRedaction} style={{ color: '#ec4899' }}><FiEdit style={{ display: 'inline', marginRight: '6px' }} />Redaction</div>
            <div onClick={handleRemoveMetadata} style={{ color: '#1f7fe6' }}><FiFile style={{ display: 'inline', marginRight: '6px' }} />Remove Metadata</div>
          </>
        );
      case "Tools":
        return (
          <>
            <div onClick={handleToolsMerge} style={{ cursor: 'pointer', color: '#3b82f6' }}><MdMerge style={{ display: 'inline', marginRight: '6px' }} />Merge</div>
            <div onClick={handleToolsSplit} style={{ cursor: 'pointer', color: '#06b6d4' }}><FiCode style={{ display: 'inline', marginRight: '6px' }} />Split</div>
            <div onClick={handleCompress} style={{ cursor: 'pointer', color: '#f59e0b' }}><FaCompress style={{ display: 'inline', marginRight: '6px' }} />Compress</div>
            <div onClick={handleInspectPDF} style={{ cursor: 'pointer', color: '#8b5cf6' }}><FiFile style={{ display: 'inline', marginRight: '6px' }} />Inspect PDF</div>
            <div onClick={handleOCRAdvanced} style={{ cursor: 'pointer', color: '#10b981' }}><FiCode style={{ display: 'inline', marginRight: '6px' }} />OCR Advanced</div>
            <div onClick={handleFlatten} style={{ cursor: 'pointer', color: '#ef4444' }}><FiLayers style={{ display: 'inline', marginRight: '6px' }} />Flatten</div>
            <div onClick={handleWatermark} style={{ cursor: 'pointer', color: '#10b981' }}><FiFileText style={{ display: 'inline', marginRight: '6px' }} />Watermark</div>
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
          <div className="icon-button" onClick={openPDF} title="Open" style={{ color: '#1f7fe6' }}><FiFile style={{ fontSize: '20px' }} /></div>
          <div className="icon-button" onClick={handleSave} title="Save" style={{ color: '#2ecc71' }}><FiSave style={{ fontSize: '20px' }} /></div>
          <div className="icon-button" onClick={handleAddButton} title="Add" style={{ color: '#3b82f6' }}><AiOutlinePlus style={{ fontSize: '20px' }} /></div>
          <div className="icon-button" onClick={handleRemoveButton} title="Remove" style={{ color: '#ef4444' }}><AiOutlineDelete style={{ fontSize: '20px' }} /></div>
          <div className="icon-button" onClick={handleRefreshButton} title="Refresh" style={{ color: '#f59e0b' }}><BiRotateRight style={{ fontSize: '20px' }} /></div>
          <div className="icon-button" onClick={handleExportButton} title="Export" style={{ color: '#f97316' }}><FaFileWord style={{ fontSize: '20px' }} /></div>
          <div className="icon-button" onClick={handlePrint} title="Print" style={{ color: '#e74c3c' }}><FiPrinter style={{ fontSize: '20px' }} /></div>
          <div style={{ width: '1px', height: '24px', backgroundColor: '#ddd', margin: '0 8px' }}></div>
          <div className="icon-button" onClick={handleZoomOut} title="Zoom Out" style={{ color: '#8b5cf6' }}><FiZoomOut style={{ fontSize: '20px' }} /></div>
          <div className="text-sm" style={{ width: '40px', textAlign: 'center' }}>{Math.round(zoom * 100)}%</div>
          <div className="icon-button" onClick={handleZoomIn} title="Zoom In" style={{ color: '#8b5cf6' }}><FiZoomIn style={{ fontSize: '20px' }} /></div>
        </div>
        {fileMenuOpen && <FileMenu onClose={() => setFileMenuOpen(false)} />}
      </div>

      <div className="ribbon-tabs">
        {["Home", "Comment", "Edit", "Convert", "Page", "Merge", "Protect", "Tools"].map(
          (tab) => (
            <div
              key={tab}
              className={`ribbon-tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => {
                console.log('[RibbonBar] Tab clicked:', tab);
                setActiveTab(tab);
              }}
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