"use client";

import React, { useRef, useEffect, useState } from 'react';

interface CustomScrollContainerProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function CustomScrollContainer({
  children,
  className = '',
  style = {},
}: CustomScrollContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const checkScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setCanScrollUp(scrollTop > 0);
    setCanScrollDown(scrollTop + clientHeight < scrollHeight);
  };

  useEffect(() => {
    checkScroll();
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        container.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, []);

  const scroll = (direction: 'up' | 'down') => {
    if (!containerRef.current) return;
    const scrollAmount = 100;
    containerRef.current.scrollBy({
      top: direction === 'up' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      {/* Up Button */}
      <button
        onClick={() => scroll('up')}
        disabled={!canScrollUp}
        style={{
          width: '100%',
          padding: '4px',
          background: canScrollUp ? '#333' : '#ccc',
          color: '#fff',
          border: '1px solid #999',
          cursor: canScrollUp ? 'pointer' : 'not-allowed',
          fontSize: '12px',
          fontWeight: 'bold',
        }}
      >
        ▲
      </button>

      {/* Scrollable Content */}
      <div
        ref={containerRef}
        className={className}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          ...style,
        }}
      >
        {children}
      </div>

      {/* Down Button */}
      <button
        onClick={() => scroll('down')}
        disabled={!canScrollDown}
        style={{
          width: '100%',
          padding: '4px',
          background: canScrollDown ? '#333' : '#ccc',
          color: '#fff',
          border: '1px solid #999',
          cursor: canScrollDown ? 'pointer' : 'not-allowed',
          fontSize: '12px',
          fontWeight: 'bold',
        }}
      >
        ▼
      </button>
    </div>
  );
}
