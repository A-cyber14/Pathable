import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "pathable-display-settings";

const DisplaySettingsContext = createContext({
  largerText:       false,
  highContrast:     false,
  toggleLargerText: () => {},
  toggleHighContrast: () => {},
});

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { largerText: false, highContrast: false };
    return { largerText: false, highContrast: false, ...JSON.parse(raw) };
  } catch {
    return { largerText: false, highContrast: false };
  }
}

function applyClasses({ largerText, highContrast }) {
  document.documentElement.classList.toggle("larger-text",  largerText);
  document.documentElement.classList.toggle("high-contrast", highContrast);
}

export function DisplaySettingsProvider({ children }) {
  const [settings, setSettings] = useState(readStorage);

  // Sync classes whenever settings change
  useEffect(() => {
    applyClasses(settings);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch { /* storage unavailable */ }
  }, [settings]);

  const toggleLargerText = () =>
    setSettings((prev) => ({ ...prev, largerText: !prev.largerText }));

  const toggleHighContrast = () =>
    setSettings((prev) => ({ ...prev, highContrast: !prev.highContrast }));

  return (
    <DisplaySettingsContext.Provider
      value={{ ...settings, toggleLargerText, toggleHighContrast }}
    >
      {children}
    </DisplaySettingsContext.Provider>
  );
}

export function useDisplaySettings() {
  return useContext(DisplaySettingsContext);
}
