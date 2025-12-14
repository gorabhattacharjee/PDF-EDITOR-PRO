"use client";

import React from "react";
import { PDFDocument } from "pdf-lib";
import { useDocumentsStore } from "@/stores/useDocumentsStore";
import logger from "@/utils/logger";
import RibbonButton from "./RibbonButton";
import toast from "react-hot-toast";
import {
  FaLock,
  FaShieldAlt,
  FaSignature,
  FaEyeSlash,
  FaTrashAlt,
} from "react-icons/fa";

export default function ProtectTab() {
  const { activeDocument, closeDocument, openDocument } = useDocumentsStore();

  const ensureDoc = () => {
    if (!activeDocument) {
      toast.error("No active document");
      return false;
    }
    return true;
  };

  const encryptPDF = async () => {
    if (!ensureDoc()) return;

    const userPassword = prompt("Enter user password (owner can open with this):", "");
    if (userPassword === null) return;

    const ownerPassword = prompt("Enter owner password (required - for opening unrestricted):");
    if (!ownerPassword) {
      toast.error('Owner password is required for encryption.');
      return;
    }

    try {
      toast.loading('Encrypting PDF...', { id: 'encrypt' });
      logger.info('PDF encryption started with backend');
      
      const formData = new FormData();
      formData.append('file', activeDocument!.file);
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
      link.download = activeDocument!.name.replace('.pdf', '_encrypted.pdf');
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

  const removeMetadata = async () => {
    if (!ensureDoc()) return;

    try {
      toast.loading('Removing metadata...', { id: 'metadata' });
      logger.info('Remove metadata started');

      const buf = await activeDocument!.file.arrayBuffer();
      const srcPdf = await PDFDocument.load(buf);

      const oldTitle = srcPdf.getTitle();
      const oldAuthor = srcPdf.getAuthor();
      const oldSubject = srcPdf.getSubject();
      const oldKeywords = srcPdf.getKeywords();
      const oldCreator = srcPdf.getCreator();
      const oldProducer = srcPdf.getProducer();

      srcPdf.setTitle('');
      srcPdf.setAuthor('');
      srcPdf.setSubject('');
      srcPdf.setKeywords([]);
      srcPdf.setCreator('');
      srcPdf.setProducer('');
      srcPdf.setCreationDate(new Date(0));
      srcPdf.setModificationDate(new Date(0));

      const bytes = await srcPdf.save();
      const cleanFile = new File(
        [new Uint8Array(bytes)],
        activeDocument!.name.replace('.pdf', '_clean.pdf'),
        { type: 'application/pdf' }
      );

      const url = window.URL.createObjectURL(cleanFile);
      const link = document.createElement('a');
      link.href = url;
      link.download = cleanFile.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      logger.success('Metadata removed successfully');
      toast.success('Metadata removed! Clean PDF downloaded.', { id: 'metadata' });

      let removedInfo = 'Removed metadata:\n';
      if (oldTitle) removedInfo += `- Title: "${oldTitle}"\n`;
      if (oldAuthor) removedInfo += `- Author: "${oldAuthor}"\n`;
      if (oldSubject) removedInfo += `- Subject: "${oldSubject}"\n`;
      if (oldKeywords) removedInfo += `- Keywords: "${oldKeywords}"\n`;
      if (oldCreator) removedInfo += `- Creator: "${oldCreator}"\n`;
      if (oldProducer) removedInfo += `- Producer: "${oldProducer}"\n`;
      
      if (removedInfo === 'Removed metadata:\n') {
        removedInfo = 'No metadata was found in the document.';
      }
      
      alert(`Metadata Removed Successfully!\n\n${removedInfo}\n\nClean PDF saved as: ${cleanFile.name}`);
    } catch (err) {
      logger.error('Remove metadata failed: ' + err);
      toast.error(`Failed to remove metadata: ${err}`, { id: 'metadata' });
    }
  };

  const setPermissions = async () => {
    if (!ensureDoc()) return;

    const ownerPwd = prompt('Enter owner password (required to set permissions):');
    if (!ownerPwd) {
      toast.error('Owner password is required');
      return;
    }

    const allowPrint = confirm('Allow printing? (OK = Yes, Cancel = No)');
    const allowCopy = confirm('Allow copying text? (OK = Yes, Cancel = No)');
    const allowModify = confirm('Allow modifications? (OK = Yes, Cancel = No)');

    try {
      toast.loading('Setting permissions...', { id: 'permissions' });
      logger.info('Setting PDF permissions');

      const formData = new FormData();
      formData.append('file', activeDocument!.file);
      formData.append('ownerPassword', ownerPwd);
      formData.append('allowPrint', allowPrint.toString());
      formData.append('allowCopy', allowCopy.toString());
      formData.append('allowModify', allowModify.toString());

      const response = await fetch('/api/set-permissions', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Permissions service error: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = activeDocument!.name.replace('.pdf', '_protected.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Permissions set and PDF downloaded!', { id: 'permissions' });
      logger.success('PDF permissions set successfully');

      alert(`Permissions Applied!\n\nPrint: ${allowPrint ? 'Allowed' : 'Denied'}\nCopy: ${allowCopy ? 'Allowed' : 'Denied'}\nModify: ${allowModify ? 'Allowed' : 'Denied'}\n\nFile: ${link.download}`);
    } catch (err) {
      logger.error('Set permissions failed: ' + err);
      toast.error(`Failed to set permissions: ${err}`, { id: 'permissions' });
    }
  };

  return (
    <div className="ribbon-row">
      <RibbonButton
        icon={<FaLock />}
        label="Encrypt"
        onClick={encryptPDF}
      />
      <RibbonButton
        icon={<FaShieldAlt />}
        label="Permissions"
        onClick={setPermissions}
      />
      <RibbonButton
        icon={<FaSignature />}
        label="Digital Signature"
        onClick={() => {
          if (!ensureDoc()) return;
          logger.info('Digital signature feature activated');
          toast('Digital signature requires a certificate. Feature coming soon!', { icon: '✍️' });
        }}
      />
      <RibbonButton
        icon={<FaEyeSlash />}
        label="Redaction"
        onClick={() => {
          if (!ensureDoc()) return;
          logger.info('Redaction feature activated');
          toast('Redaction tool: Select areas on the PDF to permanently black out. Coming soon!', { icon: '🖌️' });
        }}
      />
      <RibbonButton
        icon={<FaTrashAlt />}
        label="Remove Metadata"
        onClick={removeMetadata}
      />
    </div>
  );
}
