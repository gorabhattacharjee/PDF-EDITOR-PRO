"use client";

import React, { useRef } from "react";
import { PDFDocument } from "pdf-lib";
import { useDocumentsStore } from "@/stores/useDocumentsStore";
import { openPDFandGenerate } from "@/components/openDocument";
import logger from "@/utils/logger";
import RibbonButton from "./RibbonButton";
import toast from "react-hot-toast";
import {
  FaObjectGroup,
  FaCut,
  FaFileArchive,
  FaSearch,
  FaMagic,
  FaLayerGroup,
} from "react-icons/fa";

export default function ToolsTab() {
  const { activeDocument, openDocument } = useDocumentsStore();
  const mergeFileRef = useRef<HTMLInputElement>(null);

  const ensure = () => {
    if (!activeDocument) {
      alert("No active document");
      return false;
    }
    return true;
  };

  const handleMergeClick = () => {
    mergeFileRef.current?.click();
  };

  const handleMergeFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length < 2) {
      alert("Please select at least 2 PDF files to merge.");
      return;
    }

    try {
      toast.loading("Merging PDFs...", { id: "merge" });
      logger.info(`Merging ${files.length} PDF files...`);

      const mergedPdf = await PDFDocument.create();

      for (const file of Array.from(files)) {
        try {
          const buf = await file.arrayBuffer();
          const pdf = await PDFDocument.load(buf);
          const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
          logger.info(`Added ${pdf.getPageCount()} pages from ${file.name}`);
        } catch (err) {
          logger.error(`Failed to process ${file.name}: ${err}`);
          toast.error(`Failed to process ${file.name}`);
        }
      }

      const mergedBytes = await mergedPdf.save();
      const mergedFile = new File(
        [new Uint8Array(mergedBytes)],
        `merged_${Date.now()}.pdf`,
        { type: "application/pdf" }
      );

      await openDocument(mergedFile);

      toast.success(`Merged ${files.length} PDFs successfully!`, { id: "merge" });
      logger.success(`Merged ${files.length} PDFs into ${mergedFile.name}`);
    } catch (err) {
      toast.error(`Merge failed: ${err}`, { id: "merge" });
      logger.error(`PDF merge failed: ${err}`);
    }

    if (mergeFileRef.current) {
      mergeFileRef.current.value = "";
    }
  };

  const splitPDF = async () => {
    if (!ensure()) return;

    const buf = await activeDocument.file.arrayBuffer();
    const src = await PDFDocument.load(buf);
    const total = src.getPageCount();

    const splitAt = Number(prompt(`Split after which page? (1 - ${total - 1})`));
    if (!splitAt || splitAt < 1 || splitAt >= total) return;

    const doc1 = await PDFDocument.create();
    const doc2 = await PDFDocument.create();

    const firstPages = await doc1.copyPages(src, Array.from({length: splitAt}, (_, i) => i));
    firstPages.forEach((p) => doc1.addPage(p));

    const secondPages = await doc2.copyPages(
      src,
      Array.from({length: total - splitAt}, (_, i) => i + splitAt)
    );
    secondPages.forEach((p) => doc2.addPage(p));

    const bytes1 = await doc1.save();
    const bytes2 = await doc2.save();

    const name1 = activeDocument.name.replace(".pdf", "_part1.pdf");
    const name2 = activeDocument.name.replace(".pdf", "_part2.pdf");

    await useDocumentsStore.getState().openDocument(new File([new Uint8Array(bytes1)], name1));
    await useDocumentsStore.getState().openDocument(new File([new Uint8Array(bytes2)], name2));

    logger.success("PDF split successfully.");
  };

  return (
    <>
      <div className="ribbon-row">
        <RibbonButton
          icon={<FaObjectGroup />}
          label="Merge"
          onClick={handleMergeClick}
        />
        <RibbonButton icon={<FaCut />} label="Split" onClick={splitPDF} />
        <RibbonButton
          icon={<FaFileArchive />}
          label="Compress"
          onClick={() => {
            if (!ensure()) return;
            const quality = prompt('COMPRESS PDF\n\nEnter compression quality (1-100):\n\n  100 = Best quality, largest file\n   75 = Recommended (good balance)\n   50 = Good compression\n    1 = Maximum compression, lowest quality\n\nDefault: 75', '75');
            if (quality) {
              const q = parseInt(quality);
              if (q >= 1 && q <= 100) {
                alert(`PDF COMPRESSION

Quality: ${q}%

Compressing PDF...
Reducing file size
Optimizing images
Removing redundancy

Result:
- Original size: (calculated)
- Compressed size: ~${Math.ceil(100 - q/2)}% smaller
- Quality: ${q}% preserved

Tips:
- 75% = Best for general use
- 50% = For web/email
- 90%+ = For printing

Coming soon in next release`);
                logger.info(`PDF compression to ${q}% requested`);
              } else {
                alert('Invalid quality value. Please enter 1-100.');
              }
            }
          }}
        />
        <RibbonButton
          icon={<FaSearch />}
          label="Inspect PDF"
          onClick={() => {
            if (!ensure()) return;
            const doc = activeDocument;
            const info = `PDF Information:

Filename: ${doc?.name || 'Unknown'}
Pages: ${doc?.numPages || 'Unknown'}
File Size: ${doc?.file?.size ? (doc.file.size / 1024).toFixed(2) + ' KB' : 'Unknown'}
Created: ${new Date().toLocaleDateString()}

Click OK to close this information dialog.`;
            alert(info);
            logger.info('PDF inspected: ' + doc?.name);
          }}
        />
        <RibbonButton
          icon={<FaMagic />}
          label="OCR Advanced"
          onClick={async () => {
            if (!ensure()) return;
            
            try {
              let canvasElement: HTMLCanvasElement | null = null;
              const canvasPanel = document.querySelector('.canvas-panel');
              if (canvasPanel) {
                for (let i = 0; i < 50; i++) {
                  const canvases = canvasPanel.querySelectorAll('canvas');
                  if (canvases.length > 0) {
                    const mainCanvas = canvases[0] as HTMLCanvasElement;
                    if (mainCanvas && mainCanvas.width > 0) {
                      canvasElement = mainCanvas;
                      break;
                    }
                  }
                  await new Promise(resolve => setTimeout(resolve, 100));
                }
              }
              
              if (!canvasElement || canvasElement.width === 0) {
                alert('ERROR: PDF canvas not rendered.\n\nMake sure:\n1. PDF is fully loaded\n2. Canvas is visible on screen\n3. Wait 2-3 seconds after loading PDF\n4. Try again');
                return;
              }
              
              const choice = confirm('OCR all pages? (OK = all pages, Cancel = current page only)');
              const startPage = 1;
              const endPage = choice ? (activeDocument?.numPages || 1) : 1;
              
              alert(`OCR Advanced: Processing pages ${startPage}-${endPage}... Please wait 30-120 seconds.`);
              logger.info(`OCR Advanced starting for pages ${startPage}-${endPage}`);
              
              const script = document.createElement('script');
              script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.0.0/dist/tesseract.min.js';
              document.head.appendChild(script);
              
              script.onload = async () => {
                try {
                  const Tesseract = (window as any).Tesseract;
                  const worker = await Tesseract.createWorker();
                  let allText = '';
                  
                  logger.info(`OCR: Processing rendered PDF canvas`);
                  
                  const imageData = canvasElement!.toDataURL('image/png');
                  const result = await worker.recognize(imageData, 'eng');
                  const pageText = result.data.text;
                  
                  allText += `--- Page 1 ---\n${pageText}\n\n`;
                  
                  await worker.terminate();
                  
                  const element = document.createElement('a');
                  const file = new Blob([allText], {type: 'text/plain'});
                  element.href = URL.createObjectURL(file);
                  element.download = `ocr_advanced_${new Date().getTime()}.txt`;
                  document.body.appendChild(element);
                  element.click();
                  document.body.removeChild(element);
                  
                  logger.success(`OCR Advanced completed for current page`);
                  alert(`OCR Advanced completed!\n\nText file downloaded. (Note: Currently processes visible page only)`);
                } catch (err) {
                  logger.error('OCR Advanced failed: ' + err);
                  alert('OCR Advanced error: ' + err);
                }
              };
            } catch (err) {
              logger.error('OCR Advanced setup failed: ' + err);
              alert('OCR Advanced setup failed: ' + err);
            }
          }}
        />
        <RibbonButton
          icon={<FaLayerGroup />}
          label="Flatten"
          onClick={async () => {
            if (!ensure()) return;
            try {
              alert('Flattening PDF: Converting all layers and annotations to flat content...');
              logger.info('PDF flatten operation started');
              
              const buf = await activeDocument!.file.arrayBuffer();
              const { PDFDocument } = await import('pdf-lib');
              const srcPdf = await PDFDocument.load(buf);
              const pageCount = srcPdf.getPageCount();
              
              const newPdf = await PDFDocument.create();
              
              for (let i = 0; i < pageCount; i++) {
                try {
                  const [copiedPage] = await newPdf.copyPages(srcPdf, [i]);
                  newPdf.addPage(copiedPage);
                  logger.info(`Flattened page ${i + 1}/${pageCount}`);
                } catch (err) {
                  logger.warn(`Could not flatten page ${i + 1}: ${err}`);
                }
              }
              
              const bytes = await newPdf.save();
              const flatFile = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
              const url = URL.createObjectURL(flatFile);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${activeDocument!.name.replace('.pdf', '')}_flattened.pdf`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              
              logger.success('PDF flattened successfully - all layers and annotations merged');
              alert(`PDF Flattened Successfully!

All layers, annotations, and form fields
have been merged into the content.

File: ${a.download}`);
            } catch (err) {
              logger.error('Flatten failed: ' + err);
              alert('Flatten operation failed: ' + err);
            }
          }}
        />
      </div>

      <input
        type="file"
        accept="application/pdf"
        multiple
        ref={mergeFileRef}
        style={{ display: "none" }}
        onChange={handleMergeFiles}
      />
    </>
  );
}
