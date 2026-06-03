import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) setDarkMode(saved === 'true');
  }, []);

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', newMode);
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export const getTheme = (darkMode) => ({
  background: darkMode ? '#1a1a2e' : '#f5f5f5',
  card: darkMode ? '#16213e' : '#ffffff',
  cardBorder: darkMode ? '#2a2a4a' : '#dddddd',
  text: darkMode ? '#ffffff' : '#333333',
  textSecondary: darkMode ? '#cccccc' : '#666666',
  primary: '#e2b96f',
  success: '#27ae60',
  danger: '#c0392b',
  info: '#2980b9',
  warning: '#e67e22'
});
