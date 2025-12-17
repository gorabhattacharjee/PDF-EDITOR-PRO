'use client';

import React, { useState, useEffect } from 'react';
import useDocumentsStore from '@/stores/useDocumentsStore';
import { useUIStore } from '@/stores/useUIStore';
import logger from '@/utils/logger';
import { FiX, FiSave } from 'react-icons/fi';

export default function DocumentPropertiesModal() {
  const { activeDocument, updateDocument } = useDocumentsStore();
  const { isPropertiesModalOpen, closePropertiesModal } = useUIStore();

  // Form state
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [subject, setSubject] = useState('');
  const [keywords, setKeywords] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Populate form when modal opens or document changes
  useEffect(() => {
    if (isPropertiesModalOpen && activeDocument) {
      setTitle(activeDocument.metadata?.title || '');
      setAuthor(activeDocument.metadata?.author || '');
      setSubject(activeDocument.metadata?.subject || '');
      setKeywords(activeDocument.metadata?.keywords || '');
      setHasChanges(false);
    }
  }, [isPropertiesModalOpen, activeDocument]);

  const handleChange = () => {
    setHasChanges(true);
    console.log('[DocumentPropertiesModal] Change detected - metadata updated');
  };

  const handleSave = () => {
    if (!activeDocument) return;

    const metadata = {
      title: title || undefined,
      author: author || undefined,
      subject: subject || undefined,
      keywords: keywords || undefined,
    };

    console.log('[DocumentPropertiesModal] Saving metadata:', metadata);
    updateDocument(activeDocument.id, { metadata });

    logger.success('Document properties updated');
    setHasChanges(false);
    closePropertiesModal();
  };

  const handleCancel = () => {
    setHasChanges(false);
    closePropertiesModal();
  };

  if (!isPropertiesModalOpen || !activeDocument) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📄</span>
            <h2 className="text-xl font-bold">Document Properties</h2>
          </div>
          <button
            onClick={handleCancel}
            className="text-white hover:bg-blue-800 p-1 rounded transition"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* File Info Section */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>📁</span> File Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <label className="text-gray-600 block">Filename</label>
                <p className="font-medium text-gray-900 mt-1">{activeDocument.name}</p>
              </div>
              <div>
                <label className="text-gray-600 block">File Size</label>
                <p className="font-medium text-gray-900 mt-1">
                  {(activeDocument.file.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <div>
                <label className="text-gray-600 block">Total Pages</label>
                <p className="font-medium text-gray-900 mt-1">{activeDocument.numPages}</p>
              </div>
              <div>
                <label className="text-gray-600 block">File Type</label>
                <p className="font-medium text-gray-900 mt-1">{activeDocument.file.type || 'application/pdf'}</p>
              </div>
              <div>
                <label className="text-gray-600 block">Created</label>
                <p className="font-medium text-gray-900 mt-1">
                  {new Date(activeDocument.file.lastModified).toLocaleDateString()}
                </p>
              </div>
              <div>
                <label className="text-gray-600 block">Last Modified</label>
                <p className="font-medium text-gray-900 mt-1">
                  {new Date(activeDocument.file.lastModified).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>

          {/* Metadata Section */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>🏷️</span> Metadata (Editable)
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    handleChange();
                  }}
                  placeholder="Enter document title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Author
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => {
                    setAuthor(e.target.value);
                    handleChange();
                  }}
                  placeholder="Enter author name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    handleChange();
                  }}
                  placeholder="Enter document subject"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Keywords
                </label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => {
                    setKeywords(e.target.value);
                    handleChange();
                  }}
                  placeholder="Enter keywords separated by commas"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Info Message */}
          {hasChanges && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <span className="text-yellow-600 text-lg">⚠️</span>
              <p className="text-sm text-yellow-800">
                You have unsaved changes. Click Save to update the document metadata.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 bg-gray-50 p-6 border-t border-gray-200">
          <button
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <FiSave size={18} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
