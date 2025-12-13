"use client";

import React from "react";
import { useUIStore } from "@/stores/useUIStore";
import { usePdfActions } from "@/hooks/usePdfActions";

const SanitizeModal: React.FC = () => {
  const { closeSanitizeModal } = useUIStore();
  const { sanitizePdf } = usePdfActions();

  const handleSanitize = () => {
    sanitizePdf();
    closeSanitizeModal();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
        <h2 className="text-xl font-bold mb-4">Sanitize Document</h2>
        <p className="mb-6">
          This will permanently remove all metadata, comments, annotations, and other hidden content from the document. This action cannot be undone.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={closeSanitizeModal}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSanitize}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Sanitize
          </button>
        </div>
      </div>
    </div>
  );
};

export default SanitizeModal;
