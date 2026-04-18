import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Theme } from '../themes/themes';

// Define the available theme keys
type ThemeType = keyof typeof Theme;

// Define what the context will hold
interface ThemeContextType {
  theme: typeof Theme.dark;
  themeName: ThemeType;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeName, setThemeName] = useState<ThemeType>('dark');

  const toggleTheme = () => {
    setThemeName((prev) => {
      if (prev === 'dark') return 'light';
      if (prev === 'light') return 'cyber';
      return 'dark';
    });
  };

  // The .tsx extension allows this JSX syntax:
  return (
    <ThemeContext.Provider value={{ theme: Theme[themeName], themeName, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
};