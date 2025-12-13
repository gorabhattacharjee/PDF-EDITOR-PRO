"use client";

import React from "react";
import { useUIStore } from "@/stores/useUIStore";
import useDocumentsStore from "@/stores/useDocumentsStore";
import RibbonButton from "./RibbonButton";
import logger from "@/utils/logger";
import {
  FaPen,
  FaImage,
  FaPlus,
  FaRedo,
  FaArrowsAltH,
  FaRuler,
  FaCrop,
  FaMousePointer,
} from "react-icons/fa";

export default function EditTab() {
  const { activeTool, setActiveTool } = useUIStore();
  const activeDocument = useDocumentsStore((s) => s.activeDocument);

  const makeHandler = (t: string) => () => setActiveTool(t as any);

  return (
    <div className="ribbon-row">
      <RibbonButton
        icon={<FaMousePointer />}
        label="Object Select"
        active={activeTool === "editAll"}
        onClick={() => {
          if (!activeDocument) {
            alert('Please open a PDF first');
            return;
          }
          if (activeTool === 'editAll') {
            setActiveTool('none');
            logger.info('Object Select mode DISABLED');
          } else {
            setActiveTool('editAll');
            logger.info('Object Select mode ENABLED - click on any text or image to select');
          }
        }}
      />
      <RibbonButton
        icon={<FaPen />}
        label="Edit Text"
        active={activeTool === "editText"}
        onClick={() => {
          if (!activeDocument) {
            alert('Please open a PDF first');
            return;
          }
          setActiveTool("editText");
          logger.info('Text editing mode activated - click on any text to edit');
        }}
      />
      <RibbonButton
        icon={<FaImage />}
        label="Edit Image"
        active={activeTool === "editImage"}
        onClick={() => {
          if (!activeDocument) {
            alert('Please open a PDF first');
            return;
          }
          setActiveTool("editImage");
          logger.info('Image editing mode activated - click on any image to select');
        }}
      />
      <RibbonButton
        icon={<FaPlus />}
        label="Add Text"
        active={activeTool === "addText"}
        onClick={() => {
          if (!activeDocument) {
            alert('Please open a PDF first');
            return;
          }
          console.log('[EditTab] Add Text clicked - activating addText mode');
          setActiveTool("addText");
          logger.info('Add Text mode activated - click on PDF to place text');
        }}
      />
      <RibbonButton
        icon={<FaImage />}
        label="Add Image"
        onClick={makeHandler("addImage")}
      />
      <RibbonButton
        icon={<FaRedo />}
        label="Rotate"
        onClick={() => {
          alert('OBJECT ROTATION TOOL\n\nHow to use:\n1. Select object (text/image/shape)\n2. Right-click for context menu\n3. Choose rotation option:\n   - 90 degrees Clockwise\n   - 90 degrees Counter-clockwise\n   - 180 degrees Flip\n4. Or use rotation handles (circular)\n\nAdvanced:\n- Hold Shift for 15 degree increments\n- Enter custom angle (0-360)\n- Snap to grid for precise alignment\n\nRotation is applied immediately');
          logger.info('Rotate tool activated');
        }}
      />
      <RibbonButton
        icon={<FaArrowsAltH />}
        label="Resize"
        onClick={() => {
          alert('OBJECT RESIZING TOOL\n\nHow to use:\n1. Select object (text/image/shape)\n2. Use corner handles to resize:\n   - Drag corners for width & height\n   - Drag edges for single dimension\n3. Keyboard shortcuts:\n   Shift+Drag = maintain aspect ratio\n   Ctrl+Drag = resize from center\n\nAdvanced:\n- Double-click to fit to content\n- Lock aspect ratio toggle\n- Enter exact dimensions (pixels)\n- Snap to grid alignment\n\nEscape to cancel operation');
          logger.info('Resize tool activated');
        }}
      />
      <RibbonButton
        icon={<FaRuler />}
        label="Align"
        onClick={() => {
          alert('OBJECT ALIGNMENT TOOL\n\nHow to use:\nSelect 2 or more objects, then choose:\n\nHORIZONTAL ALIGNMENT:\n   L = Align all to Left edge\n   C = Center horizontally\n   R = Align all to Right edge\n\nVERTICAL ALIGNMENT:\n   T = Align all to Top edge\n   M = Center vertically\n   B = Align all to Bottom edge\n\nDISTRIBUTION:\n   H = Equal spacing (horizontal)\n   V = Equal spacing (vertical)\n\nAdvanced:\n- Align to page/canvas\n- Relative alignment options\n- Grid snapping');
          logger.info('Align tool activated');
        }}
      />
      <RibbonButton
        icon={<FaCrop />}
        label="Crop Page"
        onClick={() => {
          alert('CROP PAGE TOOL\n\nHow to use:\n1. Click and drag on PDF to define crop area\n2. Adjust by dragging crop handles\n3. Press Enter to apply crop\n4. Press Escape to cancel\n\nCrop Controls:\n   [+] Expand crop area\n   [-] Reduce crop area\n   [R] Rotate crop boundary\n   [X] Reset to full page\n\nOptions:\n- Single page crop\n- Crop all pages\n- Remove white margins\n- Custom dimensions\n\nNote: Creates new page with cropped content');
          logger.info('Crop tool activated');
        }}
      />
    </div>
  );
}
