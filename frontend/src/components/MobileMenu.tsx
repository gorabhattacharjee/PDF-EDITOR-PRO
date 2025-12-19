'use client';

import React from 'react';
import { useResponsive, useMobileSidebar } from '@/hooks/useResponsive';
import { FiMenu, FiX } from 'react-icons/fi';

/**
 * Mobile Menu Component
 * Provides hamburger menu and drawer navigation for mobile devices
 * Only visible on screens < 768px width
 */

export const MobileMenuToggle: React.FC = () => {
  const { isMobile } = useResponsive();
  const { isOpen, toggle } = useMobileSidebar();

  if (!isMobile) return null;

  return (
    <button
      className="md:hidden fixed bottom-5 left-5 z-50 w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors"
      onClick={toggle}
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
      title={isOpen ? 'Close menu' : 'Open menu'}
    >
      {isOpen ? (
        <FiX className="text-xl" />
      ) : (
        <FiMenu className="text-xl" />
      )}
    </button>
  );
};

/**
 * Mobile Drawer Backdrop
 * Closes drawer when clicked
 */

export const MobileDrawerBackdrop: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
      onClick={onClose}
      role="presentation"
    />
  );
};

/**
 * Mobile Sidebar Drawer
 * Slides in from left on mobile, contains page thumbnails and navigation
 */

export const MobileSidebarDrawer: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isMobile } = useResponsive();
  const { isOpen, close } = useMobileSidebar();

  if (!isMobile) {
    return null;
  }

  return (
    <>
      <MobileDrawerBackdrop isOpen={isOpen} onClose={close} />

      <div
        className={`md:hidden fixed left-0 top-0 w-3/4 max-w-sm h-full bg-white z-40 transform transition-transform duration-300 ease-in-out overflow-y-auto border-r border-gray-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {children}
      </div>
    </>
  );
};

/**
 * Responsive Layout Wrapper
 * Handles showing/hiding content based on screen size
 */

export const DesktopOnly: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isDesktop } = useResponsive();

  return isDesktop ? <>{children}</> : null;
};

export const MobileOnly: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isMobile } = useResponsive();

  return isMobile ? <>{children}</> : null;
};

export const TabletOnly: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isTablet } = useResponsive();

  return isTablet ? <>{children}</> : null;
};

export const ResponsiveContainer: React.FC<{
  children: React.ReactNode;
  mobileClassName?: string;
  tabletClassName?: string;
  desktopClassName?: string;
}> = ({ children, mobileClassName = '', tabletClassName = '', desktopClassName = '' }) => {
  const responsive = useResponsive();

  let className = '';
  if (responsive.isMobile) {
    className = mobileClassName;
  } else if (responsive.isTablet) {
    className = tabletClassName;
  } else {
    className = desktopClassName;
  }

  return <div className={className}>{children}</div>;
};
