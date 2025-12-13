// /src/utils/ui/uiFunctions.ts

/**
 * UI Helper Group
 * All RibbonBar non-PDF UI behavior is centralized here.
 *
 * PURE LOGIC — no JSX, no React — dependencies passed using S1 pattern.
 */

export interface UIHelperDeps {
  setActiveTab: (tab: string) => void;

  setShowFilePanel: (v: boolean) => void;
  setIsFileMenuOpen: (v: boolean) => void;
  setIsExportMenuOpen: (v: boolean) => void;

  setIsMergeDialogOpen: (v: boolean) => void;
  setShowExtractDialog: (v: boolean) => void;

  setSidebarOpen?: (v: boolean) => void;
  setShowOutline?: (v: boolean) => void;
  setShowThumbnails?: (v: boolean) => void;
  setShowBookmarks?: (v: boolean) => void;
  setShowAttachments?: (v: boolean) => void;

  toast?: any;
}

export function createUIHandlers({
  setActiveTab,

  setShowFilePanel,
  setIsFileMenuOpen,
  setIsExportMenuOpen,

  setIsMergeDialogOpen,
  setShowExtractDialog,

  setSidebarOpen,
  setShowOutline,
  setShowThumbnails,
  setShowBookmarks,
  setShowAttachments,

  toast,
}: UIHelperDeps) {
  // ------------------------------------------------------------
  // Stop event propagation
  // ------------------------------------------------------------
  const stop = (e: any) => e.stopPropagation();

  // ------------------------------------------------------------
  // Tab switching
  // ------------------------------------------------------------
  const handleTabSwitch = (tab: string, e?: any) => {
    if (e) e.stopPropagation();
    setActiveTab(tab);
  };

  // ------------------------------------------------------------
  // File panel toggle
  // ------------------------------------------------------------
  const handleFileTabClick = () => {
    setShowFilePanel((prev: boolean) => !prev);
  };

  // ------------------------------------------------------------
  // Zoom control
  // ------------------------------------------------------------
  const handleZoom = (
    oldValue: number,
    delta: number,
    setZoomValue: (v: number) => void
  ) => {
    const newValue = Math.max(10, Math.min(400, oldValue + delta));
    setZoomValue(newValue);
  };

  // ------------------------------------------------------------
  // Merge dialog controls
  // ------------------------------------------------------------
  const openMergeDialog = () => setIsMergeDialogOpen(true);
  const closeMergeDialog = () => setIsMergeDialogOpen(false);

  // ------------------------------------------------------------
  // Extract dialog controls
  // ------------------------------------------------------------
  const openExtractDialog = () => setShowExtractDialog(true);
  const closeExtractDialog = () => setShowExtractDialog(false);

  // ------------------------------------------------------------
  // Hide all menus when clicking outside
  // ------------------------------------------------------------
  const closeAllMenus = () => {
    setIsFileMenuOpen(false);
    setIsExportMenuOpen(false);
  };

  // ------------------------------------------------------------
  // Sidebar + outline + thumbnails + attachments
  // (optional, used only if passed)
  // ------------------------------------------------------------
  const toggleSidebar = () =>
    setSidebarOpen && setSidebarOpen((prev: boolean) => !prev);

  const toggleOutline = () =>
    setShowOutline && setShowOutline((prev: boolean) => !prev);

  const toggleThumbnails = () =>
    setShowThumbnails && setShowThumbnails((prev: boolean) => !prev);

  const toggleBookmarks = () =>
    setShowBookmarks && setShowBookmarks((prev: boolean) => !prev);

  const toggleAttachments = () =>
    setShowAttachments && setShowAttachments((prev: boolean) => !prev);

  return {
    stop,
    handleTabSwitch,
    handleFileTabClick,
    handleZoom,
    openMergeDialog,
    closeMergeDialog,
    openExtractDialog,
    closeExtractDialog,
    closeAllMenus,
    toggleSidebar,
    toggleOutline,
    toggleThumbnails,
    toggleBookmarks,
    toggleAttachments,
  };
}
