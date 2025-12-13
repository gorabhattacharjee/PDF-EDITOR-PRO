'use client';

import { useDocumentsStore } from '@/stores/useDocumentsStore';
import RibbonBar from '@/components/RibbonBar';
import Sidebar from '@/components/Sidebar';
import WelcomeBox from '@/components/WelcomeBox';
import Canvas from '@/components/Canvas';

export default function Page() {
  const { documents, activeDocId } = useDocumentsStore();
  const hasActiveDocument = documents.length > 0 && activeDocId !== null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#f9fafb]">
      {/* ✅ TOP MENU BAR (Ribbon: File, Home, Comment, etc.) */}
      <RibbonBar />

      <div className="flex flex-1 overflow-hidden">
        {/* ✅ LEFT SIDEBAR (Thumbnails, Navigation) */}
        <Sidebar />

        {/* ✅ MAIN CONTENT AREA (Canvas or WelcomeBox) */}
        <main className="flex-1 flex items-center justify-center overflow-auto bg-[#f9fafb]">
          {hasActiveDocument ? <Canvas /> : <WelcomeBox />}
        </main>
      </div>
    </div>
  );
}
