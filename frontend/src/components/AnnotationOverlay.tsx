"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  MouseEvent,
} from "react";
import type {
  Annotation,
  AnnotationTool,
  RectAnnotation,
  PenAnnotation,
} from "@/types/annotations";
import logger from "@/utils/logger";

type Props = {
  pageIndex: number;
  width: number;
  height: number;
  tool: AnnotationTool;
  annotations: Annotation[];
  onChange: (annotations: Annotation[]) => void;
};

type DragMode = "none" | "draw-rect" | "draw-pen" | "move" | "resize";

type ResizeHandle = "nw" | "ne" | "sw" | "se" | null;

const AnnotationOverlay: React.FC<Props> = ({
  pageIndex,
  width,
  height,
  tool,
  annotations,
  onChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragMode, setDragMode] = useState<DragMode>("none");
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [draftAnnotation, setDraftAnnotation] = useState<Annotation | null>(
    null
  );

  const [originalBounds, setOriginalBounds] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // Utility: id generator
  const createId = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return (
      Date.now().toString(36) + "-" + Math.random().toString(16).slice(2)
    );
  };

  // Get mouse position relative to overlay
  const getRelativePoint = (e: MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: Math.max(0, Math.min(width, e.clientX - rect.left)),
      y: Math.max(0, Math.min(height, e.clientY - rect.top)),
    };
  };

  // Helpers for typed annotations
  const isRectAnn = (a: Annotation): a is RectAnnotation =>
    a.type === "rect" || a.type === "highlight";

  const isPenAnn = (a: Annotation): a is PenAnnotation => a.type === "pen";

  /* ------------------ SELECTION / HIT TEST ------------------ */

  const hitTestAnnotation = (x: number, y: number): Annotation | null => {
    // Check topmost first: iterate from end
    for (let i = annotations.length - 1; i >= 0; i--) {
      const ann = annotations[i];
      if (ann.pageIndex !== pageIndex) continue;

      if (isRectAnn(ann)) {
        if (
          x >= ann.x &&
          x <= ann.x + ann.width &&
          y >= ann.y &&
          y <= ann.y + ann.height
        ) {
          return ann;
        }
      } else if (isPenAnn(ann)) {
        // Quick/loose hit test: bounding box + distance from segment
        const pts = ann.points;
        if (pts.length < 2) continue;
        let minX = Infinity,
          maxX = -Infinity,
          minY = Infinity,
          maxY = -Infinity;
        for (const p of pts) {
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
        }
        const padding = 6;
        if (
          x < minX - padding ||
          x > maxX + padding ||
          y < minY - padding ||
          y > maxY + padding
        ) {
          continue;
        }
        // more precise segment distance
        const dist2Seg = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
          const dx = bx - ax;
          const dy = by - ay;
          if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
          const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
          const tClamped = Math.max(0, Math.min(1, t));
          const cx = ax + tClamped * dx;
          const cy = ay + tClamped * dy;
          return Math.hypot(px - cx, py - cy);
        };
        for (let j = 0; j < pts.length - 1; j++) {
          const d = dist2Seg(x, y, pts[j].x, pts[j].y, pts[j + 1].x, pts[j + 1].y);
          if (d <= (ann.strokeWidth || 2) + 4) {
            return ann;
          }
        }
      } else if (ann.type === "note") {
        const size = 18;
        if (x >= ann.x && x <= ann.x + size && y >= ann.y && y <= ann.y + size) {
          return ann;
        }
      }
    }
    return null;
  };

  const hitTestResizeHandle = (
    ann: RectAnnotation,
    x: number,
    y: number
  ): ResizeHandle => {
    const handleSize = 10;
    const half = handleSize / 2;

    const positions: { handle: ResizeHandle; cx: number; cy: number }[] = [
      { handle: "nw", cx: ann.x, cy: ann.y },
      { handle: "ne", cx: ann.x + ann.width, cy: ann.y },
      { handle: "sw", cx: ann.x, cy: ann.y + ann.height },
      { handle: "se", cx: ann.x + ann.width, cy: ann.y + ann.height },
    ];

    for (const p of positions) {
      if (
        x >= p.cx - half &&
        x <= p.cx + half &&
        y >= p.cy - half &&
        y <= p.cy + half
      ) {
        return p.handle;
      }
    }
    return null;
  };

  /* ------------------ MOUSE DOWN ------------------ */

  const handleMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const { x, y } = getRelativePoint(e);
    setDragStart({ x, y });

    // Click with no drawing tool = selection / move / resize
    if (tool === "none") {
      const hit = hitTestAnnotation(x, y);
      if (!hit) {
        setSelectedId(null);
        setDragMode("none");
        setResizeHandle(null);
        return;
      }

      setSelectedId(hit.id);

      if (isRectAnn(hit)) {
        const handle = hitTestResizeHandle(hit, x, y);
        if (handle) {
          setResizeHandle(handle);
          setOriginalBounds({
            x: hit.x,
            y: hit.y,
            width: hit.width,
            height: hit.height,
          });
          setDragMode("resize");
          logger.info(`🔧 Resize ${handle} started on ${hit.type}`);
          return;
        }
      }

      // otherwise move
      if (isRectAnn(hit) || isPenAnn(hit) || hit.type === "note") {
        setDragMode("move");
        setOriginalBounds(
          isRectAnn(hit)
            ? { x: hit.x, y: hit.y, width: hit.width, height: hit.height }
            : null
        );
        logger.info(`✋ Move started on ${hit.type}`);
      }
      return;
    }

    // Drawing tools
    if (tool === "highlight" || tool === "rect") {
      const ann: RectAnnotation = {
        id: createId(),
        type: tool,
        pageIndex,
        x,
        y,
        width: 0,
        height: 0,
        color: tool === "highlight" ? "rgba(255,255,0,0.35)" : "rgba(0,0,255,0.2)",
      };
      setDraftAnnotation(ann);
      setDragMode("draw-rect");
      return;
    }

    if (tool === "pen") {
      const ann: PenAnnotation = {
        id: createId(),
        type: "pen",
        pageIndex,
        points: [{ x, y }],
        strokeWidth: 2,
        color: "#ff0000",
      };
      setDraftAnnotation(ann);
      setDragMode("draw-pen");
      return;
    }

    if (tool === "note") {
      const newNote: Annotation = {
        id: createId(),
        type: "note",
        pageIndex,
        x,
        y,
        text: "",
      } as any;
      onChange([...annotations, newNote]);
      setSelectedId(newNote.id);
      logger.info("📝 Note added");
      return;
    }
  };

  /* ------------------ MOUSE MOVE ------------------ */

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragStart) return;

    const { x, y } = getRelativePoint(e);

    if (dragMode === "draw-rect" && draftAnnotation && isRectAnn(draftAnnotation)) {
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;

      const newAnn: RectAnnotation = {
        ...draftAnnotation,
        x: dx >= 0 ? dragStart.x : x,
        y: dy >= 0 ? dragStart.y : y,
        width: Math.abs(dx),
        height: Math.abs(dy),
      };
      setDraftAnnotation(newAnn);
      return;
    }

    if (dragMode === "draw-pen" && draftAnnotation && isPenAnn(draftAnnotation)) {
      const newAnn: PenAnnotation = {
        ...draftAnnotation,
        points: [...draftAnnotation.points, { x, y }],
      };
      setDraftAnnotation(newAnn);
      return;
    }

    if (dragMode === "move" && selectedId) {
      const ann = annotations.find((a) => a.id === selectedId);
      if (!ann || ann.pageIndex !== pageIndex) return;

      const dx = x - dragStart.x;
      const dy = y - dragStart.y;

      let updated: Annotation | null = null;

      if (isRectAnn(ann)) {
        updated = { ...ann, x: ann.x + dx, y: ann.y + dy };
      } else if (isPenAnn(ann)) {
        updated = {
          ...ann,
          points: ann.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
        };
      } else if (ann.type === "note") {
        updated = { ...ann, x: ann.x + dx, y: ann.y + dy };
      }

      if (updated) {
        const others = annotations.filter((a) => a.id !== ann.id);
        onChange([...others, updated]);
        setDragStart({ x, y });
      }
      return;
    }

    if (dragMode === "resize" && selectedId && resizeHandle && originalBounds) {
      const ann = annotations.find((a) => a.id === selectedId);
      if (!ann || !isRectAnn(ann)) return;

      let { x: ox, y: oy, width: ow, height: oh } = originalBounds;
      let nx = ox;
      let ny = oy;
      let nw = ow;
      let nh = oh;

      if (resizeHandle === "nw") {
        nw = ow + (ox - x);
        nh = oh + (oy - y);
        nx = x;
        ny = y;
      } else if (resizeHandle === "ne") {
        nw = x - ox;
        nh = oh + (oy - y);
        ny = y;
      } else if (resizeHandle === "sw") {
        nw = ow + (ox - x);
        nh = y - oy;
        nx = x;
      } else if (resizeHandle === "se") {
        nw = x - ox;
        nh = y - oy;
      }

      // Clamp
      nw = Math.max(4, nw);
      nh = Math.max(4, nh);

      const updated: RectAnnotation = {
        ...ann,
        x: nx,
        y: ny,
        width: nw,
        height: nh,
      };
      const others = annotations.filter((a) => a.id !== ann.id);
      onChange([...others, updated]);
      return;
    }
  };

  /* ------------------ MOUSE UP ------------------ */

  const handleMouseUp = () => {
    if (dragMode === "draw-rect" && draftAnnotation && isRectAnn(draftAnnotation)) {
      if (draftAnnotation.width > 4 && draftAnnotation.height > 4) {
        onChange([...annotations, draftAnnotation]);
        setSelectedId(draftAnnotation.id);
        logger.info(`📐 ${draftAnnotation.type} added`);
      }
    } else if (dragMode === "draw-pen" && draftAnnotation && isPenAnn(draftAnnotation)) {
      if (draftAnnotation.points.length > 1) {
        onChange([...annotations, draftAnnotation]);
        setSelectedId(draftAnnotation.id);
        logger.info("✏️ Pen stroke added");
      }
    }

    setDraftAnnotation(null);
    setDragMode("none");
    setDragStart(null);
    setResizeHandle(null);
    setOriginalBounds(null);
  };

  /* ------------------ KEYBOARD DELETE ------------------ */

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!selectedId) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        const exists = annotations.some((a) => a.id === selectedId);
        if (!exists) return;
        const remaining = annotations.filter((a) => a.id !== selectedId);
        onChange(remaining);
        setSelectedId(null);
        logger.info("🗑 Annotation deleted via keyboard");
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [annotations, selectedId, onChange]);

  /* ------------------ RENDER HELPERS ------------------ */

  const renderRect = (ann: RectAnnotation, isSelected: boolean) => {
    const border =
      ann.type === "highlight"
        ? "border-yellow-400"
        : "border-blue-500";
    const bg =
      ann.type === "highlight"
        ? "bg-yellow-200/40"
        : "bg-blue-500/5";

    return (
      <div
        key={ann.id}
        className={`absolute ${bg} ${border} border rounded-sm`}
        style={{
          left: ann.x,
          top: ann.y,
          width: ann.width,
          height: ann.height,
          boxShadow: isSelected ? "0 0 0 1px #2563eb" : "none",
        }}
      >
        {isSelected && renderResizeHandles(ann)}
      </div>
    );
  };

  const renderResizeHandles = (ann: RectAnnotation) => {
    const size = 10;
    const half = size / 2;
    const base = "absolute bg-white border border-blue-500 rounded-sm";

    const handles: { key: ResizeHandle; style: React.CSSProperties }[] = [
      {
        key: "nw",
        style: {
          left: -half,
          top: -half,
          width: size,
          height: size,
          cursor: "nwse-resize",
        },
      },
      {
        key: "ne",
        style: {
          right: -half,
          top: -half,
          width: size,
          height: size,
          cursor: "nesw-resize",
        },
      },
      {
        key: "sw",
        style: {
          left: -half,
          bottom: -half,
          width: size,
          height: size,
          cursor: "nesw-resize",
        },
      },
      {
        key: "se",
        style: {
          right: -half,
          bottom: -half,
          width: size,
          height: size,
          cursor: "nwse-resize",
        },
      },
    ];

    return handles.map((h) => (
      <div key={h.key || "handle"} className={base} style={h.style} />
    ));
  };

  const renderPen = (ann: PenAnnotation, isSelected: boolean) => {
    const path = ann.points
      .map((p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
      .join(" ");

    return (
      <svg
        key={ann.id}
        className="absolute overflow-visible"
        style={{ left: 0, top: 0, width, height, pointerEvents: "none" }}
      >
        <path
          d={path}
          stroke={ann.color || "#ff0000"}
          strokeWidth={ann.strokeWidth || 2}
          fill="none"
          opacity={1}
        />
        {isSelected && (
          <path
            d={path}
            stroke="#2563eb"
            strokeWidth={(ann.strokeWidth || 2) + 2}
            fill="none"
            opacity={0.3}
          />
        )}
      </svg>
    );
  };

  const renderNote = (ann: Annotation, isSelected: boolean) => {
    const size = 18;
    return (
      <div
        key={ann.id}
        className={`absolute flex items-center justify-center text-xs ${
          isSelected ? "ring-2 ring-blue-500" : ""
        }`}
        style={{
          left: (ann as any).x,
          top: (ann as any).y,
          width: size,
          height: size,
          backgroundColor: "#fef08a",
          border: "1px solid #eab308",
          borderRadius: 4,
        }}
      >
        🗒
      </div>
    );
  };

  /* ------------------ RENDER MAIN ------------------ */

  const currentPageAnnotations = annotations.filter(
    (a) => a.pageIndex === pageIndex
  );

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ width, height, cursor: tool === "none" ? "default" : "crosshair" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Existing annotations */}
      {currentPageAnnotations.map((ann) => {
        const isSelected = ann.id === selectedId;
        if (isRectAnn(ann)) return renderRect(ann, isSelected);
        if (isPenAnn(ann)) return renderPen(ann, isSelected);
        if (ann.type === "note") return renderNote(ann, isSelected);
        return null;
      })}

      {/* Draft annotation while drawing */}
      {draftAnnotation && draftAnnotation.pageIndex === pageIndex && (
        <>
          {isRectAnn(draftAnnotation) &&
            renderRect(draftAnnotation as RectAnnotation, false)}
          {isPenAnn(draftAnnotation) &&
            renderPen(draftAnnotation as PenAnnotation, false)}
        </>
      )}
    </div>
  );
};

export default AnnotationOverlay;
