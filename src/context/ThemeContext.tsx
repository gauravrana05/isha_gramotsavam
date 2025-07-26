"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    // Load theme from localStorage or default to light
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    // Apply theme to document
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
    localStorage.setItem("theme", theme);

    // Update Material Design colors
    const root = document.documentElement;
    if (theme === "dark") {
      root.style.setProperty("--primary-color", "#FF8F00"); // Orange for dark mode
      root.style.setProperty("--background-color", "#121212");
      root.style.setProperty("--surface-color", "#1E1E1E");
      root.style.setProperty("--text-color", "#E0E0E0");
    } else {
      root.style.setProperty("--primary-color", "#FF6F00"); // Orange for light mode
      root.style.setProperty("--background-color", "#F5F5F5");
      root.style.setProperty("--surface-color", "#FFFFFF");
      root.style.setProperty("--text-color", "#212121");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};