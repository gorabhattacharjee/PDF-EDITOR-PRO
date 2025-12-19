"use client";

import React, { useEffect } from "react";
import { useThemeStore } from "@/stores/useThemeStore";

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { mode, isDarkMode } = useThemeStore();

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  useEffect(() => {
    useThemeStore.getState().initializeTheme();
  }, []);

  return <>{children}</>;
};