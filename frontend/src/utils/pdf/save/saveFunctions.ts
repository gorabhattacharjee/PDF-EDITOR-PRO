// /src/utils/pdf/save/saveFunctions.ts

import { baseName } from "@/utils/pdf/helpers/baseName"; // optional if you want
// You can remove the above import if you choose to pass baseName via deps.

export interface SaveDeps {
  activeDoc: any;
  removeDocument: (id: string) => void;
  updateDocument?: (id: string, data: any) => void; // not needed now, but good for extendability
  downloadBlob: (blob: Blob, filename: string) => void;
  baseName: (name: string | undefined, fallback: string) => string;
  toast: any; // react-hot-toast
}

/**
 * Creates Save, Save As, Close handlers for RibbonBar.
 * 100% pure logic — no React or JSX.
 */
export function createSaveHandlers({
  activeDoc,
  removeDocument,
  downloadBlob,
  baseName,
  toast,
}: SaveDeps) {

  // ----------------------------------------
  // SAVE (.pdf)
  // ----------------------------------------
  const handleSave = () => {
    if (!activeDoc) {
      toast.error("No active document.");
      return;
    }

    const blob = new Blob([activeDoc.data], { type: "application/pdf" });
    const filename = activeDoc.name || "document.pdf";

    downloadBlob(blob, filename);
    toast.success("Saved PDF");
  };

  // ----------------------------------------
  // SAVE AS (.pdf)
  // ----------------------------------------
  const handleSaveAs = (saveAsNameRaw: string): string | null => {
    if (!activeDoc) {
      toast.error("No active document.");
      return null;
    }

    let filename = saveAsNameRaw.trim();
    if (!filename) {
      filename = baseName(activeDoc.name, "document") + ".pdf";
    }

    if (!filename.toLowerCase().endsWith(".pdf")) {
      filename += ".pdf";
    }

    const blob = new Blob([activeDoc.data], { type: "application/pdf" });
    downloadBlob(blob, filename);

    toast.success(`Saved as ${filename}`);
    return filename;
  };

  // ----------------------------------------
  // CLOSE
  // ----------------------------------------
  const handleClose = () => {
    if (!activeDoc) {
      toast.error("No active document.");
      return;
    }

    removeDocument(activeDoc.id);
    toast.success("Document closed");
  };

  return {
    handleSave,
    handleSaveAs,
    handleClose,
  };
}
