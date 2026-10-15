import React, { createContext, useContext, useState, useEffect } from 'react';
import { ChartJS } from '../utils/chartConfig';

export type ThemeMode = 'light' | 'dark' | 'ocean' | 'forest' | 'warm';
export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
  currency: CurrencyCode;
  setCurrency: (curr: CurrencyCode) => void;
  formatCurrency: (amount: number, overrideCurrency?: string) => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme_mode') as ThemeMode;
    if (saved && ['light', 'dark', 'ocean', 'forest', 'warm'].includes(saved)) {
      return saved;
    }
    return 'light';
  });

  const [accentColor, setAccentColorState] = useState<string>(() => {
    return localStorage.getItem('theme_accent') || '#2563EB';
  });

  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    return (localStorage.getItem('currency_code') as CurrencyCode) || 'INR';
  });

  // Apply theme immediately to DOM and ChartJS
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark', 'theme-ocean', 'theme-forest', 'theme-warm', 'dark');

    // Add specific theme class and data-theme attribute
    root.classList.add(`theme-${theme}`);
    root.setAttribute('data-theme', theme);

    // Dark-capable themes activate the Tailwind dark: modifier
    const isDark = theme === 'dark' || theme === 'ocean' || theme === 'forest';
    if (isDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.style.colorScheme = 'light';
    }

    // Apply custom accent color if user customized it
    if (accentColor) {
      root.style.setProperty('--accent-color', accentColor);
      root.style.setProperty('--theme-accent', accentColor);
    }

    // Update Chart.js defaults for real-time contrast synchronization
    try {
      const chartColors: Record<ThemeMode, { text: string; grid: string }> = {
        light: { text: '#475569', grid: 'rgba(148, 163, 184, 0.15)' },
        dark: { text: '#94a3b8', grid: 'rgba(255, 255, 255, 0.08)' },
        ocean: { text: '#93c5fd', grid: 'rgba(147, 197, 253, 0.12)' },
        forest: { text: '#86efac', grid: 'rgba(134, 239, 172, 0.12)' },
        warm: { text: '#6b6055', grid: 'rgba(107, 96, 85, 0.12)' },
      };
      const cc = chartColors[theme] || chartColors.light;
      if (ChartJS?.defaults) {
        ChartJS.defaults.color = cc.text;
        if (ChartJS.defaults.scale?.grid) {
          ChartJS.defaults.scale.grid.color = cc.grid;
        }
      }
    } catch {
      // ignore
    }

    localStorage.setItem('theme_mode', theme);
    window.dispatchEvent(new CustomEvent('theme_changed', { detail: { theme, accentColor } }));
  }, [theme, accentColor]);

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    localStorage.setItem('theme_mode', mode);
  };

  const setAccentColor = (color: string) => {
    setAccentColorState(color);
    localStorage.setItem('theme_accent', color);
  };

  const setCurrency = (curr: CurrencyCode) => {
    setCurrencyState(curr);
    localStorage.setItem('currency_code', curr);
  };

  const formatCurrency = (amount: number, overrideCurrency?: string): string => {
    const c = overrideCurrency || currency;
    const num = Number(amount) || 0;

    let locale = 'en-IN';
    if (c === 'USD') locale = 'en-US';
    else if (c === 'EUR') locale = 'de-DE';
    else if (c === 'GBP') locale = 'en-GB';
    else if (c === 'JPY') locale = 'ja-JP';

    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: c,
        maximumFractionDigits: c === 'JPY' ? 0 : 2,
      }).format(num);
    } catch {
      const symbols: Record<string, string> = {
        INR: '₹',
        USD: '$',
        EUR: '€',
        GBP: '£',
        JPY: '¥',
        CAD: 'CA$',
        AUD: 'A$',
      };
      return `${symbols[c] || c + ' '}${num.toLocaleString()}`;
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        accentColor,
        setAccentColor,
        currency,
        setCurrency,
        formatCurrency,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
