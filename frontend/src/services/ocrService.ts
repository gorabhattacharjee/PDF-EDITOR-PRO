/**
 * OCR Service - Real text recognition
 */

export const ocrService = {
  /**
   * Perform OCR on current page using backend
   */
  async performOCR(file: File, pageNumber: number): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('page', pageNumber.toString());

    try {
      const response = await fetch('http://localhost:5000/api/ocr', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('OCR failed');
      }

      const result = await response.json();
      return result.text;
    } catch (error) {
      console.error('OCR error:', error);
      throw error;
    }
  },

  /**
   * Perform OCR on all pages
   */
  async performOCRBatch(file: File, totalPages: number): Promise<{ [page: number]: string }> {
    const results: { [page: number]: string } = {};

    for (let i = 1; i <= totalPages; i++) {
      try {
        results[i] = await this.performOCR(file, i);
      } catch (error) {
        console.error(`OCR failed for page ${i}:`, error);
        results[i] = '';
      }
    }

    return results;
  }
};
