'use client';

import useDocumentsStore from '@/stores/useDocumentsStore';

interface InspectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InspectModal({ isOpen, onClose }: InspectModalProps) {
  const { activeDocument } = useDocumentsStore();

  if (!isOpen || !activeDocument) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">📋 Document Properties</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Basic Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-2">📄 Basic Information</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Filename:</span>
                <p className="font-medium">{activeDocument.name}</p>
              </div>
              <div>
                <span className="text-gray-600">File Size:</span>
                <p className="font-medium">
                  {(activeDocument.file.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <div>
                <span className="text-gray-600">Total Pages:</span>
                <p className="font-medium">{activeDocument.numPages}</p>
              </div>
              <div>
                <span className="text-gray-600">Current Page:</span>
                <p className="font-medium">{activeDocument.currentPage}</p>
              </div>
              <div>
                <span className="text-gray-600">File Type:</span>
                <p className="font-medium">{activeDocument.file.type || 'application/pdf'}</p>
              </div>
              <div>
                <span className="text-gray-600">Last Modified:</span>
                <p className="font-medium">
                  {new Date(activeDocument.file.lastModified).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Page Information */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-2">📏 Current Page Info</h3>
            <div className="text-sm space-y-1">
              <p>
                <span className="text-gray-600">Page Number:</span>{' '}
                <span className="font-medium">
                  {activeDocument.currentPage} of {activeDocument.numPages}
                </span>
              </p>
              <p>
                <span className="text-gray-600">Progress:</span>{' '}
                <span className="font-medium">
                  {Math.round((activeDocument.currentPage / activeDocument.numPages) * 100)}%
                </span>
              </p>
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-2">📊 Statistics</h3>
            <div className="text-sm space-y-1">
              <p>
                <span className="text-gray-600">Estimated Reading Time:</span>{' '}
                <span className="font-medium">
                  {Math.ceil(activeDocument.numPages * 2)} minutes
                </span>
              </p>
              <p>
                <span className="text-gray-600">Average KB per Page:</span>{' '}
                <span className="font-medium">
                  {(activeDocument.file.size / 1024 / activeDocument.numPages).toFixed(2)} KB
                </span>
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
