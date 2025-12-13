import React, { useState, useRef, useEffect } from 'react';

interface InlineTextEditorProps {
  initialText: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  onSave: (newText: string) => void;
  onCancel: () => void;
}

export const InlineTextEditor: React.FC<InlineTextEditorProps> = ({
  initialText,
  x,
  y,
  fontSize,
  fontFamily,
  onSave,
  onCancel,
}) => {
  const [text, setText] = useState(initialText);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    console.log('[InlineTextEditor] Mounted at position:', x, y, 'with text:', initialText);
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    
    if (e.key === 'Enter') {
      e.preventDefault();
      onSave(text);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleBlur = () => {
    if (text !== initialText) {
      onSave(text);
    } else {
      onCancel();
    }
  };

  const inputWidth = Math.max(text.length * fontSize * 0.6, 100);
  
  return (
    <div
      style={{
        position: 'absolute',
        left: `${x - 6}px`,
        top: `${y - 4}px`,
        zIndex: 300,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '-2px',
          top: '-2px',
          right: '-2px',
          bottom: '-2px',
          backgroundColor: '#fff',
          borderRadius: '4px',
          boxShadow: '0 0 0 3px #fff',
        }}
      />
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        style={{
          position: 'relative',
          fontSize: `${fontSize}px`,
          fontFamily: fontFamily,
          lineHeight: 1.2,
          padding: '4px 6px',
          margin: 0,
          border: '2px solid #3b82f6',
          borderRadius: '4px',
          backgroundColor: '#fff',
          color: '#000',
          outline: 'none',
          boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
          minWidth: `${inputWidth}px`,
          width: 'auto',
        }}
      />
    </div>
  );
};

export default InlineTextEditor;
