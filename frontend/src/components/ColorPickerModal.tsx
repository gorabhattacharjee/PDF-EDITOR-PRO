"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ColorPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectColor: (color: string) => void;
  currentColor: string;
}

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', color: '#FFFF00' },
  { name: 'Green', color: '#90EE90' },
  { name: 'Cyan', color: '#00FFFF' },
  { name: 'Pink', color: '#FFB6C1' },
  { name: 'Orange', color: '#FFA500' },
  { name: 'Red', color: '#FF6B6B' },
  { name: 'Purple', color: '#DDA0DD' },
  { name: 'Blue', color: '#87CEEB' },
];

export default function ColorPickerModal({ isOpen, onClose, onSelectColor, currentColor }: ColorPickerModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      console.log('[ColorPickerModal] Modal opened');
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  console.log('[ColorPickerModal] Rendering modal content');

  const modalContent = (
    <div
      id="color-picker-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }}
      onClick={onClose}
    >
      <div
        id="color-picker-modal"
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          minWidth: '300px',
          maxWidth: '90vw',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ 
          margin: '0 0 20px 0', 
          fontSize: '18px', 
          fontWeight: 600, 
          color: '#1f2937',
          textAlign: 'center',
        }}>
          Choose Highlight Color
        </h3>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '12px',
          marginBottom: '20px',
        }}>
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.color}
              onClick={() => {
                console.log('[ColorPickerModal] Color selected:', c.color);
                onSelectColor(c.color);
              }}
              style={{
                width: '50px',
                height: '50px',
                backgroundColor: c.color,
                border: currentColor === c.color ? '4px solid #2563eb' : '3px solid #6b7280',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'transform 0.15s, box-shadow 0.15s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}
              title={c.name}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
              }}
            />
          ))}
        </div>

        <div style={{ 
          borderTop: '1px solid #e5e7eb', 
          paddingTop: '16px',
          marginBottom: '16px',
        }}>
          <label style={{ 
            display: 'block', 
            fontSize: '14px', 
            color: '#4b5563', 
            marginBottom: '8px',
            fontWeight: 500,
          }}>
            Custom Color:
          </label>
          <input
            type="color"
            value={currentColor}
            onChange={(e) => {
              console.log('[ColorPickerModal] Custom color selected:', e.target.value);
              onSelectColor(e.target.value);
            }}
            style={{
              width: '100%',
              height: '44px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              cursor: 'pointer',
              padding: '4px',
            }}
          />
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            color: '#374151',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
