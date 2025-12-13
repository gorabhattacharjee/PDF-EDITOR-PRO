import { useEffect, useState } from "react";
import { useSelection } from "@/stores/selection";

export const useTextSelection = (
  canvasRef: React.RefObject<HTMLCanvasElement>,
  pdf: any,
  activePage: number
) => {
  const { setSelectedObject, clearSelection } = useSelection();
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [endPos, setEndPos] = useState({ x: 0, y: 0 });
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    setIsSelecting(true);
    setStartPos({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
    setEndPos({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelecting) return;
    setEndPos({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
  };

  const handleMouseUp = async () => {
    if (!isSelecting) return;
    setIsSelecting(false);

    const rect = getSelectionRect();
    if (!rect || rect.width === 0 || rect.height === 0) {
      clearSelection();
      return;
    }

    if (!pdf) return;

    const page = await pdf.getPage(activePage + 1);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1 });

    const selectedItems = textContent.items.filter((item: any) => {
      const itemRect = {
        x: item.transform[4],
        y: viewport.height - item.transform[5] - item.height,
        width: item.width,
        height: item.height,
      };
      return (
        itemRect.x < rect.x + rect.width &&
        itemRect.x + itemRect.width > rect.x &&
        itemRect.y < rect.y + rect.height &&
        itemRect.y + itemRect.height > rect.y
      );
    });

    if (selectedItems.length > 0) {
      const selectedText = selectedItems.map((item: any) => item.str).join(" ");
      setSelectedObject({
        type: "text",
        id: `selection-${Date.now()}`,
        properties: {
          text: selectedText,
          rect,
        },
      });
    } else {
      clearSelection();
    }
  };

  const getSelectionRect = () => {
    const x = Math.min(startPos.x, endPos.x);
    const y = Math.min(startPos.y, endPos.y);
    const width = Math.abs(startPos.x - endPos.x);
    const height = Math.abs(startPos.y - endPos.y);
    return new DOMRect(x, y, width, height);
  };

  useEffect(() => {
    if (isSelecting) {
      setSelectionRect(getSelectionRect());
    } else {
      setSelectionRect(null);
    }
  }, [isSelecting, startPos, endPos]);

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    isSelecting,
    selectionRect,
  };
};