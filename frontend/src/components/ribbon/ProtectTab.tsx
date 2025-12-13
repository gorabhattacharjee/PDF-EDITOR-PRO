"use client";

import React from "react";
import { PDFDocument } from "pdf-lib";
import { useDocumentsStore } from "@/stores/useDocumentsStore";
import { openPDFandGenerate } from "@/components/openDocument";
import logger from "@/utils/logger";
import RibbonButton from "./RibbonButton";
import {
  FaLock,
  FaShieldAlt,
  FaSignature,
  FaEyeSlash,
  FaTrashAlt,
} from "react-icons/fa";

export default function ProtectTab() {
  const { activeDocument, closeDocument } = useDocumentsStore();

  const ensureDoc = () => {
    if (!activeDocument) {
      alert("No active document");
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
      alert('Owner password is required for encryption.');
      return;
    }

    try {
      alert('Encrypting PDF with AES-256... This may take a moment.');
      logger.info('PDF encryption started with backend');
      
      // Send PDF to backend for strong encryption
      const formData = new FormData();
      formData.append('file', activeDocument!.file);
      formData.append('userPassword', userPassword || '');
      formData.append('ownerPassword', ownerPassword);

      const response = await fetch('http://localhost:5000/api/encrypt-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Encryption service error: ${response.statusText}`);
      }

      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error('Backend returned empty file');
      }

      // Download encrypted file
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = activeDocument!.name.replace('.pdf', '_encrypted.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      logger.success('PDF encrypted successfully with AES-256');
      alert(`✓ PDF Encrypted Successfully!

File: ${link.download}

🔐 Encryption Details:
✓ AES-256 encryption
✓ User Password: ${userPassword || '(none)'}
✓ Owner Password: Protected

Security Level: STRONG

The PDF is now password-protected and requires password to open.`);
    } catch (err) {
      logger.error('Encryption failed: ' + err);
      alert(`✗ Encryption failed: ${err}

Make sure:
1. Backend server is running at http://localhost:5000
2. Try again or use external encryption tools`);
    }
  };

  const stub = (msg: string) => {
    if (!ensureDoc()) return;
    logger.info(`${msg} feature activated - Coming soon`);
    alert(`${msg}

ℹ️ This feature is coming soon!

Planned for next release.

For now:
- Use external PDF encryption tools
- Or restart backend server to reset state`);
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
        onClick={() => {
          if (!ensureDoc()) return;
          logger.info('Permissions feature activated');
          alert('🔐 PDF PERMISSIONS CONTROL\n\nRestrict user actions without encryption:\n\n✓ PRINT:\n  - Allow/Disallow printing\n  - High quality printing only\n\n✓ COPY/PASTE:\n  - Allow/Disallow text copying\n  - Prevent content extraction\n\n✓ EDIT:\n  - Disallow editing\n  - Disallow comments\n  - Allow form filling only\n\n✓ COMMENTS:\n  - Allow/Disallow comments\n  - Allow/Disallow annotations\n\nNote: Requires password to modify permissions\n✅ Coming soon in next release');
        }}
      />
      <RibbonButton
        icon={<FaSignature />}
        label="Digital Signature"
        onClick={() => {
          if (!ensureDoc()) return;
          logger.info('Digital signature feature activated');
          alert('✍️ DIGITAL SIGNATURE\n\nLegally sign PDF documents:\n\nSignature Details:\n✓ Certificate-based signature\n✓ Timestamp (server/internet)\n✓ Signature reason\n✓ Signing location\n✓ Contact information\n\nFeatures:\n✓ Visible signature field\n✓ Signature image/stamp\n✓ Certification level (Author/Form filler/Approver)\n\nVerification:\n✓ View signature status\n✓ Check validity\n✓ Verify certificate chain\n✓ See timestamp details\n\nSecurity:\n✓ Prevents tampering detection\n✓ Non-repudiation proof\n✓ Legal validity\n\n✅ Coming soon in next release');
        }}
      />
      <RibbonButton
        icon={<FaEyeSlash />}
        label="Redaction"
        onClick={() => {
          if (!ensureDoc()) return;
          logger.info('Redaction feature activated');
          alert('🖌️ REDACTION TOOL\n\nPermanently remove sensitive content:\n\n✓ REDACTION METHODS:\n1. Rectangle redaction: Black out areas\n2. Free-form: Draw custom shapes\n3. Text search: Find & redact keywords\n\n✓ FEATURES:\n- Visual selection tool\n- Multiple redaction areas\n- Preview before applying\n- Undo/Redo support\n- Batch redaction\n\n✓ SECURITY:\n- Permanent content removal\n- Prevents recovery\n- Metadata handled\n- Verification of redaction\n\n✓ USE CASES:\n- Hide personal information (SSN, DOB)\n- Remove confidential business data\n- Protect client information\n- Comply with regulations\n\n⚠️ Once applied, cannot be undone!\n✅ Coming soon in next release');
        }}
      />
      <RibbonButton
        icon={<FaTrashAlt />}
        label="Remove Metadata"
        onClick={() => {
          if (!ensureDoc()) return;
          logger.info('Remove metadata feature activated');
          alert('🗑️ REMOVE METADATA\n\nStrip all metadata for privacy:\n\n✓ DOCUMENT PROPERTIES:\n- Author\n- Title\n- Subject\n- Keywords\n- Creator application\n- Producer\n- Creation date\n- Modification date\n\n✓ HIDDEN CONTENT:\n- Comments\n- Markup\n- Attachments metadata\n- Custom properties\n- Revision information\n\n✓ FEATURES:\n- Preview what will be removed\n- Selective removal (choose what to keep)\n- Preserve document quality\n- Verify cleanup\n\n✓ PRIVACY BENEFITS:\n- Remove personal information\n- Remove tracking data\n- Prevent information leakage\n- GDPR/Privacy compliance\n\nResult: Clean PDF with no metadata\n✅ Coming soon in next release');
        }}
      />
    </div>
  );
}