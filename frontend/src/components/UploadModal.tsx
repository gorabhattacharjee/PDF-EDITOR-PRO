'use client';

import useDocumentsStore from '@/stores/useDocumentsStore';
import toast from 'react-hot-toast';

export default function UploadModal() {
  const { openDocument } = useDocumentsStore();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      openDocument(file);
      toast.success(`Opened ${file.name}`);
    } else {
      toast.error('Please select a valid PDF file');
    }
  };

  return (
    <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="text-6xl mb-4">📄</div>
          <h2 className="text-2xl font-bold mb-2">Welcome to PDF Editor Pro</h2>
          <p className="text-gray-600 mb-6">
            Open a PDF file to start editing
          </p>
          <label
            htmlFor="file-upload"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 cursor-pointer transition-colors"
          >
            📂 Open PDF File
            <input
              id="file-upload"
              name="file-upload"
              type="file"
              accept=".pdf"
              className="sr-only"
              onChange={handleFileUpload}
            />
          </label>

          <div className="mt-6 text-sm text-gray-500">
            <p>Or drag and drop a PDF file here</p>
          </div>
        </div>
      </div>
    </div>
  );
}
