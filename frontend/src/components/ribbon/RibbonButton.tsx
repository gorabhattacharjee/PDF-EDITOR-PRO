"use client";

import React from "react";

export interface RibbonButtonProps {
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
  labelStyle?: React.CSSProperties;
  active?: boolean;
}

const RibbonButton: React.FC<RibbonButtonProps> = ({
  icon,
  label,
  onClick,
  primary,
  disabled,
  labelStyle,
  active,
}) => {
  const handleClick = () => {
    console.log('[RibbonButton] Click handler fired for label:', label);
    onClick();
  };

  return (
    <button
      type="button"
      className={`ribbon-btn ${primary ? "ribbon-btn-primary" : ""} ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${active ? "ribbon-btn-active" : ""}`}
      onClick={handleClick}
      disabled={disabled}
      style={active ? { backgroundColor: '#e0e7ff', borderColor: '#6366f1', color: '#4338ca' } : undefined}
    >
      {icon && <span className="ribbon-btn-icon">{icon}</span>}
      <span className="ribbon-btn-label" style={labelStyle}>{label}</span>
    </button>
  );
};

export default RibbonButton;
