"use client";

import React from "react";
import { useUIStore, Tool } from "@/stores/useUIStore";
import RibbonButton from "./RibbonButton";
import {
  FaHighlighter,
  FaUnderline,
  FaStrikethrough,
  FaStickyNote,
  FaPen,
  FaShapes,
  FaComment,
  FaSquare,
  FaCircle,
  FaMinus,
  FaArrowRight,
} from "react-icons/fa";
import toast from "react-hot-toast";

const DRAWING_COLORS = [
  "#FF0000",
  "#00FF00",
  "#0000FF",
  "#FFFF00",
  "#FF00FF",
  "#00FFFF",
  "#000000",
  "#FF6600",
];

export default function CommentTab() {
  const { 
    activeTool, 
    setActiveTool, 
    toggleCommentsPanel,
    drawingColor,
    setDrawingColor,
    drawingStrokeWidth,
    setDrawingStrokeWidth,
    selectedShapeType,
    setSelectedShapeType,
  } = useUIStore();

  const handleToolClick = (tool: Tool, toolName: string) => {
    if (activeTool === tool) {
      setActiveTool("none");
      toast.success(`${toolName} tool deactivated`);
    } else {
      setActiveTool(tool);
      const instruction = tool === 'sticky-note' 
        ? 'click on the PDF to add a note' 
        : tool === 'pen' 
        ? 'draw on the PDF' 
        : tool === 'shapes'
        ? 'drag on the PDF to draw shapes'
        : 'select text in the PDF to apply';
      toast.success(`${toolName} tool activated - ${instruction}`);
    }
  };

  const isPenMode = activeTool === 'pen';
  const isShapesMode = activeTool === 'shapes';
  const showDrawingOptions = isPenMode || isShapesMode;

  return (
    <div className="ribbon-row" style={{ gap: '8px' }}>
      <RibbonButton
        icon={<FaHighlighter />}
        label="Highlight"
        onClick={() => handleToolClick("highlight", "Highlight")}
        active={activeTool === "highlight"}
      />
      <RibbonButton
        icon={<FaUnderline />}
        label="Underline"
        onClick={() => handleToolClick("underline", "Underline")}
        active={activeTool === "underline"}
      />
      <RibbonButton
        icon={<FaStrikethrough />}
        label="Strikeout"
        onClick={() => handleToolClick("strikeout", "Strikeout")}
        active={activeTool === "strikeout"}
      />
      <RibbonButton
        icon={<FaStickyNote />}
        label="Sticky Note"
        onClick={() => handleToolClick("sticky-note", "Sticky Note")}
        active={activeTool === "sticky-note"}
      />
      <RibbonButton
        icon={<FaPen />}
        label="Pen/Draw"
        onClick={() => handleToolClick("pen", "Pen/Draw")}
        active={activeTool === "pen"}
      />
      <RibbonButton
        icon={<FaShapes />}
        label="Shapes"
        onClick={() => handleToolClick("shapes", "Shapes")}
        active={activeTool === "shapes"}
      />
      
      {showDrawingOptions && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          marginLeft: '8px',
          paddingLeft: '12px',
          borderLeft: '1px solid #ddd',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: '#666' }}>Color:</span>
            <div style={{ display: 'flex', gap: '2px' }}>
              {DRAWING_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setDrawingColor(color)}
                  style={{
                    width: '18px',
                    height: '18px',
                    backgroundColor: color,
                    border: color === drawingColor ? '2px solid #333' : '1px solid #ccc',
                    borderRadius: '3px',
                    cursor: 'pointer',
                  }}
                  title={color}
                />
              ))}
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: '#666' }}>Width:</span>
            <select
              value={drawingStrokeWidth}
              onChange={(e) => setDrawingStrokeWidth(Number(e.target.value))}
              style={{
                padding: '2px 4px',
                fontSize: '11px',
                border: '1px solid #ccc',
                borderRadius: '3px',
              }}
            >
              <option value={1}>1px</option>
              <option value={2}>2px</option>
              <option value={3}>3px</option>
              <option value={5}>5px</option>
              <option value={8}>8px</option>
              <option value={12}>12px</option>
            </select>
          </div>
          
          {isShapesMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#666' }}>Shape:</span>
              <div style={{ display: 'flex', gap: '2px' }}>
                <button
                  onClick={() => setSelectedShapeType('rectangle')}
                  style={{
                    padding: '4px 6px',
                    backgroundColor: selectedShapeType === 'rectangle' ? '#e0e7ff' : '#fff',
                    border: selectedShapeType === 'rectangle' ? '2px solid #6366f1' : '1px solid #ccc',
                    borderRadius: '3px',
                    cursor: 'pointer',
                  }}
                  title="Rectangle"
                >
                  <FaSquare size={12} />
                </button>
                <button
                  onClick={() => setSelectedShapeType('circle')}
                  style={{
                    padding: '4px 6px',
                    backgroundColor: selectedShapeType === 'circle' ? '#e0e7ff' : '#fff',
                    border: selectedShapeType === 'circle' ? '2px solid #6366f1' : '1px solid #ccc',
                    borderRadius: '3px',
                    cursor: 'pointer',
                  }}
                  title="Circle"
                >
                  <FaCircle size={12} />
                </button>
                <button
                  onClick={() => setSelectedShapeType('line')}
                  style={{
                    padding: '4px 6px',
                    backgroundColor: selectedShapeType === 'line' ? '#e0e7ff' : '#fff',
                    border: selectedShapeType === 'line' ? '2px solid #6366f1' : '1px solid #ccc',
                    borderRadius: '3px',
                    cursor: 'pointer',
                  }}
                  title="Line"
                >
                  <FaMinus size={12} />
                </button>
                <button
                  onClick={() => setSelectedShapeType('arrow')}
                  style={{
                    padding: '4px 6px',
                    backgroundColor: selectedShapeType === 'arrow' ? '#e0e7ff' : '#fff',
                    border: selectedShapeType === 'arrow' ? '2px solid #6366f1' : '1px solid #ccc',
                    borderRadius: '3px',
                    cursor: 'pointer',
                  }}
                  title="Arrow"
                >
                  <FaArrowRight size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      <RibbonButton
        icon={<FaComment />}
        label="Comments Panel"
        onClick={toggleCommentsPanel}
      />
    </div>
  );
}
