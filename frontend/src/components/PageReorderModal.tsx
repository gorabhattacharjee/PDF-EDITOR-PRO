'use client';

import { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { pdfOperations } from '../services/pdfOperations';
import toast from 'react-hot-toast';

interface MergeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MergeModal({ isOpen, onClose }: MergeModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [merging, setMerging] = useState(false);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles([...files, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      toast.error('Please select at least 2 PDFs to merge');
      return;
    }

    setMerging(true);
    try {
      const pdfDocs = await Promise.all(
        files.map(async (file) => {
          const arrayBuffer = await file.arrayBuffer();
          return await PDFDocument.load(arrayBuffer);
        })
      );

      const mergedPdf = await pdfOperations.mergePdfs(pdfDocs);
      await pdfOperations.savePdf(mergedPdf, 'merged.pdf');
      
      toast.success('PDFs merged successfully!');
      setFiles([]);
      onClose();
    } catch (error) {
      console.error('Merge error:', error);
      toast.error('Failed to merge PDFs');
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Merge PDFs</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
            ×
          </button>
        </div>

        <div className="mb-4">
          <label className="block mb-2">
            <span className="text-sm font-medium text-gray-700">Add PDFs to merge:</span>
            <input
              type="file"
              accept=".pdf"
              multiple
              onChange={handleFileSelect}
              className="block w-full mt-1 text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
          </label>
        </div>

        <div className="space-y-2 mb-4">
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div className="flex items-center">
                <span className="mr-2">{index + 1}.</span>
                <span className="text-sm">{file.name}</span>
              </div>
              <button
                onClick={() => removeFile(index)}
                className="text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        {files.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No files selected. Add at least 2 PDFs to merge.
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-50"
            disabled={merging}
          >
            Cancel
          </button>
          <button
            onClick={handleMerge}
            disabled={files.length < 2 || merging}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {merging ? 'Merging...' : `Merge ${files.length} PDFs`}
          </button>
        </div>
      </div>
    </div>
  );
}
