import { useUIStore } from "@/stores/useUIStore";
import toast from "react-hot-toast";

export const useCommentTools = () => {
  const { setActiveTool, activeTool } = useUIStore();

  const toggleTool = (
    tool:
      | "highlight"
      | "underline"
      | "strikeout"
      | "pen"
      | "shapes"
      | "sticky-note"
  ) => {
    if (activeTool === tool) {
      setActiveTool("none");
      toast.success(`Switched to Select tool`);
    } else {
      setActiveTool(tool);
      toast.success(`Switched to ${tool} tool`);
    }
  };

  const setHighlight = () => toggleTool("highlight");
  const setUnderline = () => toggleTool("underline");
  const setStrikeout = () => toggleTool("strikeout");
  const setPen = () => toggleTool("pen");
  const setShapes = () => toggleTool("shapes");
  const setStickyNote = () => toggleTool("sticky-note");

  return {
    setHighlight,
    setUnderline,
    setStrikeout,
    setPen,
    setShapes,
    setStickyNote,
  };
};