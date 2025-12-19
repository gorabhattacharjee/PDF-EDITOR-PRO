import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'auto';

export interface ThemeState {
  mode: ThemeMode;
  isDarkMode: boolean;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  initializeTheme: () => void;
}

/**
 * Theme Store for Dark Mode support
 * Persists user preference to localStorage
 * Supports light, dark, and auto (system preference) modes
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'light',
      isDarkMode: false,

      /**
       * Set theme mode
       */
      setTheme: (mode: ThemeMode) => {
        const isDarkMode = mode === 'dark' || 
          (mode === 'auto' && 
            typeof window !== 'undefined' && 
            window.matchMedia('(prefers-color-scheme: dark)').matches);

        // Apply to document
        if (typeof document !== 'undefined') {
          if (isDarkMode) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }

        set({ mode, isDarkMode });
      },

      /**
       * Toggle between light and dark mode
       */
      toggleTheme: () => {
        const { mode } = get();
        const newMode = mode === 'light' ? 'dark' : 'light';
        get().setTheme(newMode);
      },

      /**
       * Initialize theme on app load
       * Checks localStorage and system preference
       */
      initializeTheme: () => {
        if (typeof window === 'undefined') return;

        const savedMode = localStorage.getItem('theme-mode') as ThemeMode | null;
        const mode = savedMode || 'auto';

        get().setTheme(mode);

        // Listen for system theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
          const { mode: currentMode } = get();
          if (currentMode === 'auto') {
            get().setTheme('auto');
          }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      },
    }),
    {
      name: 'theme-store',
      partialize: (state) => ({ mode: state.mode }),
    }
  )
);
