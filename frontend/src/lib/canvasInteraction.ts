/**
 * Canvas Interaction Manager
 * Handles mouse/touch events for PDF canvas tools (Hand, Select, Highlight, Draw, etc.)
 */

export type ToolType = 
  | 'hand' 
  | 'select' 
  | 'highlight' 
  | 'underline' 
  | 'strikeout' 
  | 'pen' 
  | 'shapes' 
  | 'sticky-note'
  | 'add-text'
  | 'add-image'
  | 'none';

export interface Point {
  x: number;
  y: number;
}

export interface Annotation {
  id: string;
  type: ToolType;
  page: number;
  points: Point[];
  color: string;
  text?: string;
  width?: number;
  height?: number;
}

export class CanvasInteractionManager {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private activeTool: ToolType = 'none';
  private isDrawing = false;
  private isPanning = false;
  private startPoint: Point | null = null;
  private currentAnnotation: Annotation | null = null;
  private annotations: Annotation[] = [];
  private panOffset: Point = { x: 0, y: 0 };
  private lastPanPoint: Point | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.setupEventListeners();
  }

  setActiveTool(tool: ToolType) {
    this.activeTool = tool;
    this.updateCursor();
  }

  private updateCursor() {
    if (!this.canvas) return;
    
    const cursorMap: Record<ToolType, string> = {
      'hand': 'grab',
      'select': 'pointer',
      'highlight': 'text',
      'underline': 'text',
      'strikeout': 'text',
      'pen': 'crosshair',
      'shapes': 'crosshair',
      'sticky-note': 'copy',
      'add-text': 'text',
      'add-image': 'copy',
      'none': 'default'
    };

    this.canvas.style.cursor = cursorMap[this.activeTool] || 'default';
  }

  private setupEventListeners() {
    if (!this.canvas) return;

    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));

    // Touch support
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
  }

  private getCanvasPoint(clientX: number, clientY: number): Point {
    if (!this.canvas) return { x: 0, y: 0 };
    
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left - this.panOffset.x,
      y: clientY - rect.top - this.panOffset.y
    };
  }

  private handleMouseDown(e: MouseEvent) {
    const point = this.getCanvasPoint(e.clientX, e.clientY);
    this.startPoint = point;

    if (this.activeTool === 'hand') {
      this.isPanning = true;
      this.lastPanPoint = point;
      if (this.canvas) this.canvas.style.cursor = 'grabbing';
      return;
    }

    if (['highlight', 'underline', 'strikeout', 'pen', 'shapes'].includes(this.activeTool)) {
      this.isDrawing = true;
      this.currentAnnotation = {
        id: `annotation-${Date.now()}`,
        type: this.activeTool,
        page: 1, // Will be set by parent component
        points: [point],
        color: this.getToolColor(this.activeTool)
      };
    }

    if (this.activeTool === 'sticky-note') {
      this.createStickyNote(point);
    }
  }

  private handleMouseMove(e: MouseEvent) {
    const point = this.getCanvasPoint(e.clientX, e.clientY);

    if (this.isPanning && this.lastPanPoint) {
      const dx = point.x - this.lastPanPoint.x;
      const dy = point.y - this.lastPanPoint.y;
      this.panOffset.x += dx;
      this.panOffset.y += dy;
      this.lastPanPoint = point;
      this.redraw();
      return;
    }

    if (this.isDrawing && this.currentAnnotation) {
      this.currentAnnotation.points.push(point);
      this.redraw();
    }
  }

  private handleMouseUp(e: MouseEvent) {
    if (this.isPanning) {
      this.isPanning = false;
      this.lastPanPoint = null;
      if (this.canvas) this.canvas.style.cursor = 'grab';
    }

    if (this.isDrawing && this.currentAnnotation) {
      this.isDrawing = false;
      this.annotations.push(this.currentAnnotation);
      this.currentAnnotation = null;
      this.redraw();
    }
  }

  private handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    const touch = e.touches[0];
    this.handleMouseDown(new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY
    }));
  }

  private handleTouchMove(e: TouchEvent) {
    e.preventDefault();
    const touch = e.touches[0];
    this.handleMouseMove(new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    }));
  }

  private handleTouchEnd(e: TouchEvent) {
    e.preventDefault();
    this.handleMouseUp(new MouseEvent('mouseup'));
  }

  private getToolColor(tool: ToolType): string {
    const colorMap: Record<string, string> = {
      'highlight': 'rgba(255, 255, 0, 0.4)',
      'underline': '#0000FF',
      'strikeout': '#FF0000',
      'pen': '#000000',
      'shapes': '#0000FF'
    };
    return colorMap[tool] || '#000000';
  }

  private createStickyNote(point: Point) {
    const text = prompt('Enter note text:');
    if (text) {
      const note: Annotation = {
        id: `note-${Date.now()}`,
        type: 'sticky-note',
        page: 1,
        points: [point],
        color: '#FFEB3B',
        text,
        width: 150,
        height: 100
      };
      this.annotations.push(note);
      this.redraw();
    }
  }

  private redraw() {
    if (!this.ctx || !this.canvas) return;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Redraw all annotations
    this.annotations.forEach(annotation => this.drawAnnotation(annotation));

    // Draw current annotation being created
    if (this.currentAnnotation) {
      this.drawAnnotation(this.currentAnnotation);
    }
  }

  private drawAnnotation(annotation: Annotation) {
    if (!this.ctx) return;

    this.ctx.strokeStyle = annotation.color;
    this.ctx.fillStyle = annotation.color;
    this.ctx.lineWidth = annotation.type === 'pen' ? 2 : 3;

    switch (annotation.type) {
      case 'highlight':
        this.drawHighlight(annotation);
        break;
      case 'underline':
        this.drawUnderline(annotation);
        break;
      case 'strikeout':
        this.drawStrikeout(annotation);
        break;
      case 'pen':
        this.drawPen(annotation);
        break;
      case 'shapes':
        this.drawShape(annotation);
        break;
      case 'sticky-note':
        this.drawStickyNote(annotation);
        break;
    }
  }

  private drawHighlight(annotation: Annotation) {
    if (!this.ctx || annotation.points.length < 2) return;
    
    const start = annotation.points[0];
    const end = annotation.points[annotation.points.length - 1];
    
    this.ctx.fillStyle = annotation.color;
    this.ctx.fillRect(
      start.x,
      start.y,
      end.x - start.x,
      20 // Fixed height for highlight
    );
  }

  private drawUnderline(annotation: Annotation) {
    if (!this.ctx || annotation.points.length < 2) return;
    
    const start = annotation.points[0];
    const end = annotation.points[annotation.points.length - 1];
    
    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y + 20);
    this.ctx.lineTo(end.x, end.y + 20);
    this.ctx.stroke();
  }

  private drawStrikeout(annotation: Annotation) {
    if (!this.ctx || annotation.points.length < 2) return;
    
    const start = annotation.points[0];
    const end = annotation.points[annotation.points.length - 1];
    
    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y + 10);
    this.ctx.lineTo(end.x, end.y + 10);
    this.ctx.stroke();
  }

  private drawPen(annotation: Annotation) {
    if (!this.ctx || annotation.points.length < 2) return;
    
    this.ctx.beginPath();
    this.ctx.moveTo(annotation.points[0].x, annotation.points[0].y);
    
    for (let i = 1; i < annotation.points.length; i++) {
      this.ctx.lineTo(annotation.points[i].x, annotation.points[i].y);
    }
    
    this.ctx.stroke();
  }

  private drawShape(annotation: Annotation) {
    if (!this.ctx || annotation.points.length < 2) return;
    
    const start = annotation.points[0];
    const end = annotation.points[annotation.points.length - 1];
    
    this.ctx.strokeRect(
      start.x,
      start.y,
      end.x - start.x,
      end.y - start.y
    );
  }

  private drawStickyNote(annotation: Annotation) {
    if (!this.ctx || annotation.points.length === 0) return;
    
    const point = annotation.points[0];
    const width = annotation.width || 150;
    const height = annotation.height || 100;
    
    // Draw note background
    this.ctx.fillStyle = annotation.color;
    this.ctx.fillRect(point.x, point.y, width, height);
    
    // Draw border
    this.ctx.strokeStyle = '#FFC107';
    this.ctx.strokeRect(point.x, point.y, width, height);
    
    // Draw text
    if (annotation.text) {
      this.ctx.fillStyle = '#000000';
      this.ctx.font = '12px Arial';
      this.ctx.fillText(annotation.text, point.x + 5, point.y + 20, width - 10);
    }
  }

  getAnnotations(): Annotation[] {
    return [...this.annotations];
  }

  clearAnnotations() {
    this.annotations = [];
    this.redraw();
  }

  destroy() {
    // Cleanup event listeners if needed
    this.canvas = null;
    this.ctx = null;
  }
}
