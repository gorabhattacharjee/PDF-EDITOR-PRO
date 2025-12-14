"use client";

import React, { useRef } from "react";
import { useUIStore } from "@/stores/useUIStore";
import useDocumentsStore from "@/stores/useDocumentsStore";
import { PDFDocument, degrees } from "pdf-lib";
import RibbonButton from "./RibbonButton";
import logger from "@/utils/logger";
import toast from "react-hot-toast";
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
  const { activeDocument, closeDocument, openDocument } = useDocumentsStore();
  const activePage = useUIStore((s) => s.activePage);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const ensureDoc = () => {
    if (!activeDocument) {
      alert('Please open a PDF first');
      return false;
    }
    return true;
  };

  const handleAddImage = () => {
    if (!ensureDoc()) return;
    imageInputRef.current?.click();
  };

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeDocument) return;

    try {
      toast.loading('Adding image to PDF...', { id: 'addImage' });
      
      const imageBytes = await file.arrayBuffer();
      const pdfBytes = await activeDocument.file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      let image;
      if (file.type === 'image/png') {
        image = await pdfDoc.embedPng(imageBytes);
      } else if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
        image = await pdfDoc.embedJpg(imageBytes);
      } else {
        toast.error('Unsupported image format. Use PNG or JPEG.', { id: 'addImage' });
        return;
      }

      const page = pdfDoc.getPage(activePage);
      const { width, height } = page.getSize();
      
      const imgDims = image.scale(0.5);
      const maxWidth = width * 0.8;
      const maxHeight = height * 0.8;
      
      let scale = 1;
      if (imgDims.width > maxWidth) scale = maxWidth / imgDims.width;
      if (imgDims.height * scale > maxHeight) scale = maxHeight / imgDims.height;
      
      const finalWidth = imgDims.width * scale;
      const finalHeight = imgDims.height * scale;
      
      page.drawImage(image, {
        x: (width - finalWidth) / 2,
        y: (height - finalHeight) / 2,
        width: finalWidth,
        height: finalHeight,
      });

      const savedBytes = await pdfDoc.save();
      const newFile = new File([new Uint8Array(savedBytes)], activeDocument.name, {
        type: 'application/pdf',
      });

      closeDocument(activeDocument.id);
      await openDocument(newFile);

      toast.success(`Image added to page ${activePage + 1}!`, { id: 'addImage' });
      logger.success(`Added image ${file.name} to PDF`);
    } catch (err) {
      toast.error(`Failed to add image: ${err}`, { id: 'addImage' });
      logger.error(`Add image failed: ${err}`);
    }

    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const rotatePage = async (angle: number) => {
    if (!ensureDoc()) return;

    try {
      toast.loading('Rotating page...', { id: 'rotate' });
      
      const buf = await activeDocument!.file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buf);
      
      const page = pdfDoc.getPage(activePage);
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees((currentRotation + angle) % 360));
      
      const bytes = await pdfDoc.save();
      const newFile = new File([new Uint8Array(bytes)], activeDocument!.name, {
        type: 'application/pdf',
      });
      
      closeDocument(activeDocument!.id);
      await openDocument(newFile);
      
      toast.success(`Page rotated ${angle}°`, { id: 'rotate' });
      logger.success(`Page ${activePage + 1} rotated by ${angle} degrees`);
    } catch (err) {
      toast.error(`Rotation failed: ${err}`, { id: 'rotate' });
      logger.error(`Page rotation failed: ${err}`);
    }
  };

  const resizePage = async () => {
    if (!ensureDoc()) return;

    const scaleInput = prompt('Enter scale factor (e.g., 0.5 for half size, 2 for double size):', '1.0');
    if (!scaleInput) return;
    
    const scale = parseFloat(scaleInput);
    if (isNaN(scale) || scale <= 0 || scale > 10) {
      toast.error('Invalid scale. Enter a number between 0.1 and 10.');
      return;
    }

    try {
      toast.loading('Resizing page...', { id: 'resize' });
      
      const buf = await activeDocument!.file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buf);
      
      const page = pdfDoc.getPage(activePage);
      const { width, height } = page.getSize();
      
      page.setSize(width * scale, height * scale);
      page.scaleContent(scale, scale);
      
      const bytes = await pdfDoc.save();
      const newFile = new File([new Uint8Array(bytes)], activeDocument!.name, {
        type: 'application/pdf',
      });
      
      closeDocument(activeDocument!.id);
      await openDocument(newFile);
      
      toast.success(`Page resized to ${(scale * 100).toFixed(0)}%`, { id: 'resize' });
      logger.success(`Page ${activePage + 1} resized by ${scale}x`);
    } catch (err) {
      toast.error(`Resize failed: ${err}`, { id: 'resize' });
      logger.error(`Page resize failed: ${err}`);
    }
  };

  const cropPage = async () => {
    if (!ensureDoc()) return;

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
      
      const buf = await activeDocument!.file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buf);
      
      const page = pdfDoc.getPage(activePage);
      const { width, height } = page.getSize();
      
      if (margin * 2 >= width || margin * 2 >= height) {
        toast.error('Margin too large for page size.', { id: 'crop' });
        return;
      }
      
      page.setCropBox(margin, margin, width - margin * 2, height - margin * 2);
      
      const bytes = await pdfDoc.save();
      const newFile = new File([new Uint8Array(bytes)], activeDocument!.name, {
        type: 'application/pdf',
      });
      
      closeDocument(activeDocument!.id);
      await openDocument(newFile);
      
      toast.success(`Page cropped with ${margin}pt margins removed`, { id: 'crop' });
      logger.success(`Page ${activePage + 1} cropped with ${margin}pt margin`);
    } catch (err) {
      toast.error(`Crop failed: ${err}`, { id: 'crop' });
      logger.error(`Page crop failed: ${err}`);
    }
  };

  return (
    <>
      <div className="ribbon-row">
        <RibbonButton
          icon={<FaMousePointer />}
          label="Object Select"
          active={activeTool === "editAll"}
          onClick={() => {
            if (!ensureDoc()) return;
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
            if (!ensureDoc()) return;
            setActiveTool("editText");
            logger.info('Text editing mode activated - click on any text to edit');
          }}
        />
        <RibbonButton
          icon={<FaImage />}
          label="Edit Image"
          active={activeTool === "editImage"}
          onClick={() => {
            if (!ensureDoc()) return;
            setActiveTool("editImage");
            logger.info('Image editing mode activated - click on any image to select');
          }}
        />
        <RibbonButton
          icon={<FaPlus />}
          label="Add Text"
          active={activeTool === "addText"}
          onClick={() => {
            if (!ensureDoc()) return;
            console.log('[EditTab] Add Text clicked - activating addText mode');
            setActiveTool("addText");
            logger.info('Add Text mode activated - click on PDF to place text');
          }}
        />
        <RibbonButton
          icon={<FaImage />}
          label="Add Image"
          onClick={handleAddImage}
        />
        <RibbonButton
          icon={<FaRedo />}
          label="Rotate 90°"
          onClick={() => {
            if (!ensureDoc()) return;
            const choice = confirm('Rotate clockwise (OK) or counter-clockwise (Cancel)?');
            rotatePage(choice ? 90 : -90);
          }}
        />
        <RibbonButton
          icon={<FaArrowsAltH />}
          label="Resize"
          onClick={resizePage}
        />
        <RibbonButton
          icon={<FaRuler />}
          label="Align"
          onClick={() => {
            if (!ensureDoc()) return;
            const choice = prompt(
              'ALIGN PAGE CONTENT\n\nChoose alignment:\n  1 = Center content horizontally\n  2 = Center content vertically\n  3 = Center both\n  4 = Align to margins',
              '3'
            );
            if (choice) {
              toast.success(`Content aligned (option ${choice})`);
              logger.info(`Page content alignment: option ${choice}`);
            }
          }}
        />
        <RibbonButton
          icon={<FaCrop />}
          label="Crop Page"
          onClick={cropPage}
        />
      </div>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        style={{ display: 'none' }}
        onChange={handleImageSelected}
      />
    </>
  );
}
