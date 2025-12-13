"use client";

import React from "react";
import { useDocumentsStore } from "@/stores/useDocumentsStore";
import { useUIStore } from "@/stores/useUIStore";
import { PDFDocument } from "pdf-lib";
import logger from "@/utils/logger";
import { openPDFandGenerate } from "@/components/openDocument";
import RibbonButton from "./RibbonButton";
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
  const { activeDocument, closeDocument } = useDocumentsStore();
  const activePage = useUIStore((s) => s.activePage);

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

    pdfDoc.removePage(activePage);

    const bytes = await pdfDoc.save();
    const newFile = new File([new Uint8Array(bytes)], activeDocument.name, {
      type: "application/pdf",
    });

    closeDocument(activeDocument.id);

    const loaded = await openPDFandGenerate(newFile);
    await useDocumentsStore.getState().openDocument(loaded.file || newFile);

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

    const loaded = await openPDFandGenerate(newFile);
    await useDocumentsStore.getState().openDocument(loaded.file || newFile);

    logger.success("Page extracted.");
  };

  const stub = (msg: string) => {
    if (!ensureDoc()) return;
    logger.info(`${msg} feature activated - Coming soon`);
    alert(`${msg}

ℹ️ This feature is coming soon!

Planned for next release.

Current workarounds:
- Use external PDF tools for advanced page operations
- Check Tools tab for additional options`);
  };

  return (
    <div className="ribbon-row">
      <RibbonButton
        icon={<FaFileMedical />}
        label="Insert Page"
        onClick={() => {
          if (!ensureDoc()) return;
          const response = prompt('INSERT PAGE\n\n1 = Blank page\n2 = From PDF file\n3 = From template\n\nEnter 1-3:');
          if (response === '1') {
            alert('📄 INSERT BLANK PAGE\n\n✓ Adds new blank page at current position\n\nOptions:\n- Position: Before/After current page\n- Page size: Letter, A4, Legal, etc.\n- Orientation: Portrait/Landscape\n- Background: White/Transparent\n- Count: Insert multiple pages\n\n⏳ Coming soon in next release');
            logger.info('Insert blank page requested');
          } else if (response === '2') {
            alert('📁 INSERT FROM FILE\n\nImport pages from another PDF:\n✓ Select PDF file to import from\n✓ Choose pages to insert (range)\n✓ Choose position (before/after)\n✓ Merge with current document\n✓ Preserve formatting & links\n\nExample:\n- Import pages 1-5 from file.pdf\n- Insert after page 3 of current PDF\n\n⏳ Coming soon in next release');
            logger.info('Insert from file requested');
          } else if (response === '3') {
            alert('🎨 INSERT FROM TEMPLATE\n\nChoose from predefined templates:\n✓ Title page\n✓ Table of contents\n✓ Chapter divider\n✓ Blank lined page\n✓ Grid page\n✓ Blank graph paper\n✓ Checklist page\n✓ Notes page\n\nAll templates are:\n- Professionally designed\n- Fully customizable\n- High resolution\n\n⏳ Coming soon in next release');
            logger.info('Insert from template requested');
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
          const dir = prompt('ROTATE PAGE\n\n1 = 90° Clockwise ↻\n2 = 90° Counter-clockwise ↺\n3 = 180° Flip ⏺\n\nEnter 1-3:');
          if (dir === '1' || dir === '2' || dir === '3') {
            const angles: {[key: string]: number} = {'1': 90, '2': 270, '3': 180};
            const descriptions: {[key: string]: string} = {
              '1': 'Rotate 90° Clockwise ↻',
              '2': 'Rotate 90° Counter-clockwise ↺',
              '3': 'Flip 180° ⏺'
            };
            alert(`🔄 ${descriptions[dir]}

✓ Applies permanent rotation to page

Options:
- Apply to: Current page / All pages
- Rotation: 90° increments
- Preserve: Links, form fields, comments

Result:
- Page orientation changes
- Content rotates with page
- File size unchanged

⏳ Coming soon in next release`);
            logger.info(`Rotate page ${angles[dir]}° requested`);
          }
        }}
      />
      <RibbonButton
        icon={<FaUndo />}
        label="Reverse Rotate"
        onClick={() => {
          if (!ensureDoc()) return;
          alert('↺ REVERSE ROTATE PAGE\n\nRotates page counter-clockwise (90° increments):\n✓ One click: 270° rotation (= 90° CCW)\n✓ Convenient for fixing page orientation\n\nOptions:\n- Apply to: Current page / All pages\n- Direction: Always counter-clockwise\n- Multiple: Rotate repeatedly\n\nCommon uses:\n- Fix upside-down pages\n- Correct landscape pages\n- Normalize document orientation\n\n⏳ Coming soon in next release');
          logger.info('Reverse rotate page requested');
        }}
      />
      <RibbonButton
        icon={<FaListOl />}
        label="Reorder Pages"
        onClick={() => {
          if (!ensureDoc()) return;
          alert('📑 REORDER PAGES\n\nRearrange pages in document:\n\n✓ Methods:\n1. Drag & drop in thumbnail panel\n2. Cut/paste pages\n3. Move page dialog\n4. Batch operations\n\n✓ Features:\n- Multi-select pages\n- Move before/after\n- Preview changes\n- Undo/Redo support\n- Preserve links across pages\n\nExample:\n- Drag page 5 to position 2\n- Pages reorder automatically\n- All content stays intact\n\n⏳ Coming soon in next release');
          logger.info('Reorder pages requested');
        }}
      />
      <RibbonButton
        icon={<FaCopy />}
        label="Duplicate Page"
        onClick={() => {
          if (!ensureDoc()) return;
          const count = prompt('DUPLICATE PAGE\n\nHow many times? (1-10)\n\nDefault: 1', '1');
          if (count && parseInt(count) >= 1 && parseInt(count) <= 10) {
            alert(`📋 DUPLICATE PAGE ${count}x

✓ Creates ${parseInt(count)} copy${parseInt(count) > 1 ? 's' : ''} of current page

Options:
- Count: 1-10 duplicates
- Position: After current page
- Content: Exact copy (all elements)

What's duplicated:
✓ All text
✓ All images
✓ All annotations
✓ All comments
✓ Form fields
✓ Links

Useful for:
- Creating similar pages
- Batch document creation
- Template pages

⏳ Coming soon in next release`);
            logger.info(`Duplicate page ${count}x requested`);
          }
        }}
      />
    </div>
  );
}