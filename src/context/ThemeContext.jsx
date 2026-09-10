import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem('alr_theme_mode') || 'auto';
  });

  const [activeTheme, setActiveTheme] = useState('light');

  useEffect(() => {
    function calculateTheme() {
      if (themeMode === 'light') return 'light';
      if (themeMode === 'sunlight') return 'sunlight';
      if (themeMode === 'dark') return 'dark';
      // Auto: 6 AM (6) to 6 PM (18) is light, otherwise dark
      const hour = new Date().getHours();
      return hour >= 6 && hour < 18 ? 'light' : 'dark';
    }

    const current = calculateTheme();
    setActiveTheme(current);
    document.documentElement.setAttribute('data-theme', current);

    // If auto mode, update every 15 minutes
    if (themeMode === 'auto') {
      const interval = setInterval(() => {
        const updated = calculateTheme();
        setActiveTheme(updated);
        document.documentElement.setAttribute('data-theme', updated);
      }, 15 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [themeMode]);

  const cycleTheme = () => {
    let nextMode;
    if (themeMode === 'auto') nextMode = 'light';
    else if (themeMode === 'light') nextMode = 'sunlight';
    else if (themeMode === 'sunlight') nextMode = 'dark';
    else nextMode = 'auto';

    setThemeMode(nextMode);
    localStorage.setItem('alr_theme_mode', nextMode);
  };

  const [uiScale, setUiScale] = useState(() => {
    return localStorage.getItem('alr_ui_scale') || 'normal';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-ui-scale', uiScale);
    localStorage.setItem('alr_ui_scale', uiScale);
  }, [uiScale]);

  const increaseUiScale = () => {
    setUiScale(prev => {
      if (prev === 'normal') return 'large';
      if (prev === 'large') return 'huge';
      return 'huge';
    });
  };

  const decreaseUiScale = () => {
    setUiScale(prev => {
      if (prev === 'huge') return 'large';
      if (prev === 'large') return 'normal';
      return 'normal';
    });
  };

  const updateThemeMode = (mode) => {
    setThemeMode(mode);
    localStorage.setItem('alr_theme_mode', mode);
  };

  return (
    <ThemeContext.Provider value={{
      themeMode,
      activeTheme,
      setThemeMode: updateThemeMode,
      cycleTheme,
      uiScale,
      setUiScale,
      increaseUiScale,
      decreaseUiScale
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
