/**
 * Bookmarks Service - Extract and display PDF bookmarks
 */

export interface Bookmark {
  level: number;
  title: string;
  page: number;
}

export const bookmarksService = {
  /**
   * Extract bookmarks from PDF
   */
  async extractBookmarks(file: File): Promise<Bookmark[]> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/extract-bookmarks', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to extract bookmarks');
      }

      const result = await response.json();
      return result.bookmarks || [];
    } catch (error) {
      console.error('Bookmark extraction error:', error);
      return [];
    }
  },

  /**
   * Format bookmark tree for display
   */
  formatBookmarks(bookmarks: Bookmark[]): string {
    return bookmarks
      .map((b) => `${'  '.repeat(b.level - 1)}${b.title} (Page ${b.page})`)
      .join('\n');
  }
};
