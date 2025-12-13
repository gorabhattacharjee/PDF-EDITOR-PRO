import { useUIStore } from "@/stores/useUIStore";

export const useCanvasInteraction = () => {
  const { activeTool, setActiveTool } = useUIStore();

  const selectHandTool = () => setActiveTool("hand" as any);
  const selectSelectTool = () => setActiveTool("select" as any);

  return {
    isHandToolActive: activeTool === "hand",
    isSelectToolActive: activeTool === "select",
    selectHandTool,
    selectSelectTool,
  };
};