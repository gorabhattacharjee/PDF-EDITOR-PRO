/**
 * Encryption Service - Real PDF encryption via backend
 */

export const encryptionService = {
  /**
   * Encrypt PDF with password using backend
   */
  async encryptPDF(file: File, password: string): Promise<Blob> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('password', password);

    try {
      const response = await fetch('http://localhost:5000/api/encrypt', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Encryption failed');
      }

      return await response.blob();
    } catch (error) {
      console.error('Encryption error:', error);
      throw error;
    }
  },

  /**
   * Download encrypted PDF
   */
  async encryptAndDownload(file: File, password: string, filename: string): Promise<void> {
    const encryptedBlob = await this.encryptPDF(file, password);
    
    const url = URL.createObjectURL(encryptedBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `encrypted_${filename}`;
    link.click();
    URL.revokeObjectURL(url);
  }
};
